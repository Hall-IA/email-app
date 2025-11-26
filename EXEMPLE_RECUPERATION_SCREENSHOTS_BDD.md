# 📸 Exemple : Récupérer et afficher les screenshots depuis la BDD

Ce guide montre comment récupérer et afficher les captures d'écran des tickets de support stockées en base64 dans PostgreSQL.

---

## 🗄️ Structure des données

Dans la table `support_tickets`, la colonne `screenshots` contient un tableau JSON d'objets :

```json
[
  {
    "name": "screenshot1.png",
    "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "type": "image/png"
  },
  {
    "name": "screenshot2.jpg",
    "data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...",
    "type": "image/jpeg"
  }
]
```

---

## 📊 Exemple 1 : Page d'administration des tickets

### Créer une API route pour lister les tickets

**`src/app/api/admin/tickets/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const result = await query(`
      SELECT 
        id,
        name,
        email,
        category,
        subject,
        message,
        screenshots,
        status,
        created_at,
        updated_at
      FROM support_tickets
      ORDER BY created_at DESC
      LIMIT 50
    `);

    return NextResponse.json({
      tickets: result.rows
    });
  } catch (error: any) {
    console.error('Erreur récupération tickets:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Afficher les tickets dans une page admin

**`src/app/(app)/admin/tickets/page.tsx`**

```typescript
'use client';

import { useEffect, useState } from 'react';

interface Screenshot {
  name: string;
  data: string; // base64
  type: string;
}

interface Ticket {
  id: string;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  screenshots: Screenshot[];
  status: string;
  created_at: string;
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    fetch('/api/admin/tickets')
      .then(res => res.json())
      .then(data => setTickets(data.tickets));
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Tickets de support</h1>

      <div className="grid gap-4">
        {tickets.map(ticket => (
          <div 
            key={ticket.id} 
            className="border rounded-lg p-4 hover:shadow-lg transition cursor-pointer"
            onClick={() => setSelectedTicket(ticket)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">{ticket.subject}</h3>
                <p className="text-gray-600">{ticket.name} - {ticket.email}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {ticket.screenshots.length} capture(s) d'écran
                </p>
              </div>
              <span className={`px-3 py-1 rounded text-sm ${
                ticket.status === 'new' ? 'bg-yellow-100 text-yellow-800' :
                ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {ticket.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de détails */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">{selectedTicket.subject}</h2>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="font-semibold">De :</label>
                <p>{selectedTicket.name} ({selectedTicket.email})</p>
              </div>

              <div>
                <label className="font-semibold">Message :</label>
                <p className="whitespace-pre-wrap">{selectedTicket.message}</p>
              </div>

              {/* Affichage des screenshots */}
              {selectedTicket.screenshots.length > 0 && (
                <div>
                  <label className="font-semibold">Captures d'écran :</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    {selectedTicket.screenshots.map((screenshot, index) => (
                      <div key={index} className="border rounded p-2">
                        <p className="text-sm text-gray-600 mb-2">{screenshot.name}</p>
                        {/* Afficher l'image depuis le base64 */}
                        <img 
                          src={screenshot.data} 
                          alt={screenshot.name}
                          className="w-full h-auto rounded cursor-pointer hover:opacity-80"
                          onClick={() => window.open(screenshot.data, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 📊 Exemple 2 : Télécharger une image depuis la BDD

### API route pour télécharger une image spécifique

**`src/app/api/admin/tickets/[ticketId]/screenshot/[index]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticketId: string; index: string } }
) {
  try {
    const { ticketId, index } = params;
    const screenshotIndex = parseInt(index);

    // Récupérer le ticket
    const result = await query(
      `SELECT screenshots FROM support_tickets WHERE id = $1`,
      [ticketId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Ticket non trouvé' },
        { status: 404 }
      );
    }

    const screenshots = result.rows[0].screenshots;
    
    if (!screenshots[screenshotIndex]) {
      return NextResponse.json(
        { error: 'Screenshot non trouvé' },
        { status: 404 }
      );
    }

    const screenshot = screenshots[screenshotIndex];
    
    // Extraire les données base64 (enlever le préfixe "data:image/...;base64,")
    const base64Data = screenshot.data.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    // Retourner l'image
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': screenshot.type || 'image/png',
        'Content-Disposition': `attachment; filename="${screenshot.name}"`,
      },
    });
  } catch (error: any) {
    console.error('Erreur téléchargement screenshot:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Utilisation dans le frontend

```tsx
<button
  onClick={() => {
    window.open(
      `/api/admin/tickets/${ticket.id}/screenshot/${index}`,
      '_blank'
    );
  }}
  className="bg-blue-500 text-white px-4 py-2 rounded"
>
  Télécharger {screenshot.name}
</button>
```

---

## 📊 Exemple 3 : Requête SQL directe

### Récupérer tous les noms de fichiers

```sql
SELECT 
  t.id,
  t.subject,
  s.screenshot_info->>'name' as screenshot_name,
  LENGTH(s.screenshot_info->>'data') as data_size
FROM support_tickets t
CROSS JOIN LATERAL jsonb_array_elements(t.screenshots) as s(screenshot_info)
WHERE jsonb_array_length(t.screenshots) > 0
ORDER BY t.created_at DESC;
```

### Calculer la taille totale des screenshots par ticket

```sql
SELECT 
  id,
  subject,
  jsonb_array_length(screenshots) as nb_screenshots,
  pg_size_pretty(
    pg_column_size(screenshots)
  ) as screenshots_size
FROM support_tickets
WHERE jsonb_array_length(screenshots) > 0
ORDER BY pg_column_size(screenshots) DESC;
```

---

## 🎨 Exemple 4 : Galerie d'images

### Component React pour afficher une galerie

```tsx
'use client';

import { useState } from 'react';

interface Screenshot {
  name: string;
  data: string;
  type: string;
}

interface ScreenshotGalleryProps {
  screenshots: Screenshot[];
}

export function ScreenshotGallery({ screenshots }: ScreenshotGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!screenshots || screenshots.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Miniatures */}
      <div className="grid grid-cols-3 gap-2">
        {screenshots.map((screenshot, index) => (
          <div
            key={index}
            className="aspect-video bg-gray-100 rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500"
            onClick={() => setSelectedIndex(index)}
          >
            <img
              src={screenshot.data}
              alt={screenshot.name}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedIndex !== null && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedIndex(null)}
        >
          <div className="relative max-w-7xl max-h-[90vh]">
            <img
              src={screenshots[selectedIndex].data}
              alt={screenshots[selectedIndex].name}
              className="max-w-full max-h-[90vh] object-contain"
            />
            
            {/* Navigation */}
            {screenshots.length > 1 && (
              <>
                {selectedIndex > 0 && (
                  <button
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white text-black p-3 rounded-full hover:bg-gray-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIndex(selectedIndex - 1);
                    }}
                  >
                    ←
                  </button>
                )}
                
                {selectedIndex < screenshots.length - 1 && (
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white text-black p-3 rounded-full hover:bg-gray-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIndex(selectedIndex + 1);
                    }}
                  >
                    →
                  </button>
                )}
              </>
            )}
            
            {/* Info */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded">
              {screenshots[selectedIndex].name} ({selectedIndex + 1}/{screenshots.length})
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## ⚡ Performances et optimisation

### Pagination des tickets

Pour éviter de charger trop de données base64 d'un coup :

```typescript
// API avec pagination
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;
  const offset = (page - 1) * limit;

  const result = await query(`
    SELECT 
      id, name, email, subject, status,
      jsonb_array_length(screenshots) as nb_screenshots,
      created_at
    FROM support_tickets
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);

  // Ne pas envoyer les screenshots dans la liste
  // Les charger seulement quand on ouvre un ticket spécifique
  
  return NextResponse.json({ tickets: result.rows });
}
```

### Lazy loading des images

```tsx
<img 
  src={screenshot.data}
  alt={screenshot.name}
  loading="lazy"  // ← Chargement différé
  className="w-full h-auto"
/>
```

---

## 🎯 Résumé

✅ **Les screenshots sont stockés en base64 dans la colonne `screenshots` (JSONB)**  
✅ **Facile à récupérer et afficher avec `<img src={screenshot.data} />`**  
✅ **Pas besoin de service externe**  
✅ **Images toujours disponibles, même après des années**

---

**Vous avez maintenant tous les outils pour gérer les screenshots de support ! 🚀**

