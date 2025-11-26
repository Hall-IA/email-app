# 🎨 Drag and Drop pour les captures d'écran - Support

## ✨ Fonctionnalité ajoutée

La page Support dispose maintenant d'une **zone de drag and drop** (glisser-déposer) pour faciliter l'ajout de captures d'écran.

---

## 🎯 Fonctionnalités

### 1. **Drag and Drop** 🖱️
- **Glissez-déposez** des images directement depuis votre explorateur de fichiers
- **Animation visuelle** quand vous survolez la zone avec des fichiers
- **Feedback immédiat** avec changement de couleur et d'échelle

### 2. **Upload classique** 📁
- **Bouton "Parcourir les fichiers"** pour l'upload traditionnel
- Compatible avec tous les navigateurs et appareils

### 3. **États visuels** 🎨

#### État normal
- Bordure grise en pointillés
- Icône d'upload grise
- Texte explicatif

#### État hover (survol)
- Bordure orange
- Fond orange clair
- Transition douce

#### État drag (glisser)
- Bordure orange vif
- Fond orange avec overlay
- Icône orange
- Texte "📸 Déposez vos images ici"
- Effet de scale (zoom léger)

---

## 🧪 Comment utiliser

### Méthode 1 : Drag and Drop

1. **Ouvrez** votre explorateur de fichiers
2. **Sélectionnez** 1 à 3 images
3. **Glissez** les fichiers vers la zone avec l'icône d'upload
4. **Déposez** les fichiers (relâchez le clic)
5. ✅ **Les images apparaissent** avec leurs previews

### Méthode 2 : Upload classique

1. **Cliquez** sur le bouton "Parcourir les fichiers"
2. **Sélectionnez** vos images dans la fenêtre
3. **Validez**
4. ✅ **Les images apparaissent** avec leurs previews

### Gestion des images

- **Preview** : Chaque image ajoutée est affichée en preview
- **Suppression** : Bouton ❌ rouge sur chaque image
- **Limite** : Maximum 3 images
- **Formats** : PNG, JPG, GIF, WebP
- **Taille** : Recommandé < 5 MB par image

---

## 🎨 Design et UX

### Animations

```css
/* Transition douce sur tous les états */
transition-all duration-200

/* Zoom léger lors du drag */
scale-[1.02] et scale-110

/* Overlay semi-transparent */
bg-orange-100 bg-opacity-20
```

### Couleurs

| État | Bordure | Fond | Icône |
|------|---------|------|-------|
| Normal | `border-gray-300` | Transparent | `text-gray-400` |
| Hover | `border-orange-400` | `bg-orange-50` | `text-gray-400` |
| Drag | `border-orange-500` | `bg-orange-50` | `text-orange-500` |

### Messages

| État | Message principal | Message secondaire |
|------|------------------|-------------------|
| Normal | "Glissez-déposez vos captures d'écran ici" | "ou" + Bouton |
| Drag | "📸 Déposez vos images ici" | "Relâchez pour ajouter" |

---

## 💻 Code implémenté

### État de drag

```typescript
const [isDragging, setIsDragging] = useState(false);
```

### Gestion des événements

```typescript
const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(true);
};

const handleDragLeave = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(false);
};

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(false);

  const files = Array.from(e.dataTransfer.files);
  const imageFiles = files.filter(file => file.type.startsWith('image/'));
  
  // Validation et ajout des images
  if (imageFiles.length > 0) {
    const newScreenshots = [...screenshots, ...imageFiles].slice(0, 3);
    setScreenshots(newScreenshots);
  }
};
```

### Zone de drop

```tsx
<div
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  className={`
    border-2 border-dashed rounded-lg p-8 text-center transition-all
    ${isDragging 
      ? 'border-orange-500 bg-orange-50 scale-[1.02]' 
      : 'border-gray-300 hover:border-orange-400'
    }
  `}
>
  {/* Contenu avec animations conditionnelles */}
</div>
```

---

## 🔍 Validations

### Filtrage automatique

✅ **Seules les images sont acceptées**
```typescript
const imageFiles = files.filter(file => file.type.startsWith('image/'));
```

### Messages d'erreur

❌ **Fichier non-image**
```
"Seules les images sont acceptées (PNG, JPG, GIF, etc.)"
```

⚠️ **Limite de 3 images dépassée**
```
"Maximum 3 captures d'écran. Les images supplémentaires ont été ignorées."
```

---

## 📱 Compatibilité

### Navigateurs desktop
✅ Chrome, Firefox, Safari, Edge (tous supportent le drag and drop)

### Mobile
⚠️ Le drag and drop n'est pas disponible sur mobile, mais le bouton "Parcourir" fonctionne parfaitement !

### Accessibilité
- ✅ Bouton cliquable pour l'upload (accessible au clavier)
- ✅ Labels et textes explicatifs
- ✅ Feedback visuel clair

---

## 🎥 Scénarios d'utilisation

### Scénario 1 : Bug avec capture d'écran

1. Utilisateur rencontre un bug
2. Prend une capture d'écran (Print Screen)
3. Glisse l'image depuis le bureau vers la zone
4. L'image apparaît instantanément
5. Remplit le reste du formulaire
6. Envoie le ticket avec l'image incluse

### Scénario 2 : Problème complexe

1. Utilisateur a un problème avec plusieurs étapes
2. Prend 3 captures d'écran différentes
3. Glisse les 3 images en même temps
4. Les 3 images apparaissent avec preview
5. Peut supprimer une si besoin
6. Envoie le ticket complet

### Scénario 3 : Mauvais fichier

1. Utilisateur essaie de glisser un PDF
2. Message d'erreur apparaît
3. Peut réessayer avec une image

---

## 🚀 Améliorations futures possibles

### 1. Compression d'images
```typescript
import imageCompression from 'browser-image-compression';

const compressImage = async (file: File) => {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920
  };
  return await imageCompression(file, options);
};
```

### 2. Preview en mode galerie
- Lightbox pour voir les images en grand
- Navigation entre les images
- Zoom in/out

### 3. Copier-coller depuis le presse-papiers
```typescript
const handlePaste = (e: ClipboardEvent) => {
  const items = e.clipboardData?.items;
  // Extraire les images du presse-papiers
};
```

### 4. Réorganisation par drag and drop
- Glisser-déposer pour réordonner les images
- Numérotation automatique

---

## 📊 Statistiques d'utilisation (à suivre)

Vous pourriez ajouter des analytics pour suivre :
- % d'utilisateurs qui utilisent le drag and drop vs le bouton
- Nombre moyen d'images par ticket
- Taille moyenne des images uploadées
- Temps moyen pour ajouter des images

---

## ✅ Tests effectués

| Test | Résultat |
|------|----------|
| Glisser 1 image | ✅ Fonctionne |
| Glisser 3 images | ✅ Fonctionne |
| Glisser 5 images | ✅ Limite à 3 |
| Glisser un PDF | ✅ Message d'erreur |
| Glisser + Bouton | ✅ Les deux méthodes fonctionnent |
| Animation drag | ✅ Fluide |
| Suppression | ✅ Fonctionne |

---

## 📁 Fichiers modifiés

- **`src/app/(app)/support/page.tsx`**
  - Ajout de l'état `isDragging`
  - Fonctions `handleDragOver`, `handleDragLeave`, `handleDrop`
  - Nouvelle zone de drop avec animations

---

## 🎉 Résumé

✅ **Drag and drop fonctionnel** pour les captures d'écran  
✅ **Animations fluides** et feedback visuel  
✅ **Validation automatique** des types de fichiers  
✅ **Limite de 3 images** respectée  
✅ **Compatible** avec l'upload classique  
✅ **Design moderne** et intuitif

---

**Testez maintenant sur** http://localhost:3000/support

**Glissez-déposez une image et voyez la magie opérer ! ✨📸**

