import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from './db';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'votre-secret-jwt-tres-securise-changez-moi';
const JWT_EXPIRES_IN = '7d';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  email_confirmed_at?: string;
  user_metadata?: {
    full_name?: string;
  };
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  user: User;
}

export interface AuthError {
  message: string;
  name: string;
  status: number;
}

// Générer un token JWT
export function generateToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Vérifier un token JWT
export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

// Hash un mot de passe
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Vérifier un mot de passe
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Inscription
export async function signUp(
  email: string,
  password: string,
  fullName: string
): Promise<{ user: User | null; error: AuthError | null }> {
  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await query(
      'SELECT id FROM profiles WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return {
        user: null,
        error: {
          message: 'Un utilisateur avec cet email existe déjà',
          name: 'UserAlreadyExists',
          status: 400,
        },
      };
    }

    // Hash du mot de passe
    const passwordHash = await hashPassword(password);

    // Créer l'utilisateur
    const userId = uuidv4();
    const now = new Date().toISOString();
    
    await query(
      `INSERT INTO profiles (id, email, password_hash, full_name, created_at, updated_at, email_confirmed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, email, passwordHash, fullName, now, now, now] // email_confirmed_at est défini immédiatement
    );

    const user: User = {
      id: userId,
      email,
      full_name: fullName,
      email_confirmed_at: now,
      user_metadata: { full_name: fullName },
    };

    return { user, error: null };
  } catch (error: any) {
    console.error('SignUp error:', error);
    return {
      user: null,
      error: {
        message: error.message || 'Erreur lors de l\'inscription',
        name: 'SignUpError',
        status: 500,
      },
    };
  }
}

// Connexion
export async function signIn(
  email: string,
  password: string
): Promise<{ user: User | null; session: Session | null; error: AuthError | null }> {
  try {
    // Trouver l'utilisateur
    const result = await query(
      'SELECT id, email, password_hash, full_name, email_confirmed_at FROM profiles WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return {
        user: null,
        session: null,
        error: {
          message: 'Email ou mot de passe incorrect',
          name: 'InvalidCredentials',
          status: 401,
        },
      };
    }

    const userRecord = result.rows[0];

    // Vérifier si l'utilisateur a un mot de passe (migration depuis Supabase)
    if (!userRecord.password_hash) {
      return {
        user: null,
        session: null,
        error: {
          message: 'Compte migré depuis Supabase. Veuillez vous inscrire à nouveau ou contacter le support pour réinitialiser votre mot de passe.',
          name: 'PasswordMigrationRequired',
          status: 401,
        },
      };
    }

    // Vérifier le mot de passe
    const isValid = await verifyPassword(password, userRecord.password_hash);

    if (!isValid) {
      return {
        user: null,
        session: null,
        error: {
          message: 'Email ou mot de passe incorrect',
          name: 'InvalidCredentials',
          status: 401,
        },
      };
    }

    // Créer le token
    const token = generateToken(userRecord.id, userRecord.email);
    const expiresIn = 7 * 24 * 60 * 60; // 7 jours en secondes
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    const user: User = {
      id: userRecord.id,
      email: userRecord.email,
      full_name: userRecord.full_name,
      email_confirmed_at: userRecord.email_confirmed_at,
      user_metadata: { full_name: userRecord.full_name },
    };

    const session: Session = {
      access_token: token,
      refresh_token: token, // Pour simplifier, on utilise le même token
      expires_in: expiresIn,
      expires_at: expiresAt,
      user,
    };

    return { user, session, error: null };
  } catch (error: any) {
    console.error('SignIn error:', error);
    return {
      user: null,
      session: null,
      error: {
        message: error.message || 'Erreur lors de la connexion',
        name: 'SignInError',
        status: 500,
      },
    };
  }
}

// Obtenir l'utilisateur depuis le token
export async function getUserFromToken(
  token: string
): Promise<{ user: User | null; error: AuthError | null }> {
  try {
    const decoded = verifyToken(token);

    if (!decoded) {
      return {
        user: null,
        error: {
          message: 'Token invalide ou expiré',
          name: 'InvalidToken',
          status: 401,
        },
      };
    }

    // Récupérer l'utilisateur depuis la base de données
    const result = await query(
      'SELECT id, email, full_name, email_confirmed_at FROM profiles WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return {
        user: null,
        error: {
          message: 'Utilisateur non trouvé',
          name: 'UserNotFound',
          status: 404,
        },
      };
    }

    const userRecord = result.rows[0];

    const user: User = {
      id: userRecord.id,
      email: userRecord.email,
      full_name: userRecord.full_name,
      email_confirmed_at: userRecord.email_confirmed_at,
      user_metadata: { full_name: userRecord.full_name },
    };

    return { user, error: null };
  } catch (error: any) {
    console.error('GetUser error:', error);
    return {
      user: null,
      error: {
        message: error.message || 'Erreur lors de la récupération de l\'utilisateur',
        name: 'GetUserError',
        status: 500,
      },
    };
  }
}

