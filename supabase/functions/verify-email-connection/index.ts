import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VerifyEmailRequest {
  email: string;
  password: string;
  imap_host: string;
  imap_port: number;
}

async function verifyImapConnection(
  host: string,
  port: number,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`[IMAP Test] Attempting connection to ${host}:${port} with user ${email}`);

  try {
    let conn;

    if (port === 993) {
      conn = await Deno.connectTls({
        hostname: host,
        port: port,
      });
    } else {
      conn = await Deno.connect({
        hostname: host,
        port: port,
      });
    }

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const readLine = async (): Promise<string> => {
      const buffer = new Uint8Array(4096);
      const n = await conn.read(buffer);
      if (n === null) throw new Error("Connection closed");
      return decoder.decode(buffer.subarray(0, n));
    };

    const greeting = await readLine();
    console.log("Server greeting:", greeting);

    if (!greeting.includes("OK")) {
      conn.close();
      return { success: false, error: "Réponse invalide du serveur IMAP" };
    }

    await conn.write(encoder.encode(`A001 LOGIN "${email}" "${password}"\r\n`));

    const loginResponse = await readLine();
    console.log("Login response:", loginResponse);

    await conn.write(encoder.encode("A002 LOGOUT\r\n"));

    try {
      await readLine();
    } catch {
      // Ignore logout response
    }

    conn.close();

    if (loginResponse.includes("A001 OK") || loginResponse.toLowerCase().includes("completed") || loginResponse.toLowerCase().includes("success")) {
      console.log("✅ Connexion IMAP réussie");
      return { success: true };
    } else if (loginResponse.includes("NO") || loginResponse.includes("BAD") || loginResponse.toLowerCase().includes("invalid") || loginResponse.toLowerCase().includes("fail")) {
      return { success: false, error: "Email, mot de passe ou serveur IMAP incorrect" };
    } else {
      return { success: false, error: "Échec de l'authentification" };
    }
  } catch (error: any) {
    console.error("❌ Erreur IMAP:", error);

    let errorMessage = "Connexion échouée";

    if (error.name === "ConnectionRefused" || error.code === "ECONNREFUSED") {
      errorMessage = `Impossible de se connecter à ${host}:${port}`;
    } else if (error.name === "TimedOut" || error.code === "ETIMEDOUT") {
      errorMessage = "Délai d'attente dépassé lors de la connexion au serveur";
    } else if (error.message?.includes("getaddrinfo") || error.code === "ENOTFOUND") {
      errorMessage = "Serveur introuvable. Vérifiez l'adresse du serveur IMAP.";
    } else {
      errorMessage = error.message || "Erreur inconnue";
    }

    return { success: false, error: errorMessage };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    console.log("📋 Auth header présent:", !!authHeader);

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing authorization header",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          persistSession: false,
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    console.log("👤 User récupéré:", user?.id, "Error:", userError?.message);

    if (userError || !user) {
      console.error("❌ Auth error:", userError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Non authentifié. Veuillez vous reconnecter.",
          details: userError?.message,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const body: VerifyEmailRequest = await req.json();
    console.log("📧 Received request:", { email: body.email, host: body.imap_host, port: body.imap_port });

    const { email, password, imap_host, imap_port } = body;

    if (!email || !password || !imap_host || !imap_port) {
      console.error("❌ Missing parameters:", {
        hasEmail: !!email,
        hasPassword: !!password,
        hasImapHost: !!imap_host,
        hasImapPort: !!imap_port,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Paramètres manquants. Vérifiez tous les champs.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log(`🔌 Testing connection to ${imap_host}:${imap_port} for ${email}`);
    const result = await verifyImapConnection(imap_host, imap_port, email, password);
    console.log("✉️ Connection result:", result);

    if (result.success) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Connexion IMAP réussie"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  } catch (error: any) {
    console.error("❌ Erreur:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Erreur serveur"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }
});