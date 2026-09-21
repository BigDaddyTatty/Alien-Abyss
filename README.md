# Alien Abyss — Web Game

This folder is ready for GitHub Pages.

## Publish it

1. Create a new GitHub repository named `alien-abyss`.
2. Upload **everything inside this folder** to the repository root.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`.
6. Save.
7. Wait for GitHub Pages to publish.
8. Open the generated Pages URL in Safari.

The game is intentionally split into:
- `index.html` — page/game UI
- `style.css` — visual styling
- `game.js` — game logic
- `assets/creatures/` — future creature PNGs
- `assets/environments/` — future rock/cave PNGs
- `assets/player/` — future player PNGs

No server or database is required for the current version. Save progress uses browser localStorage.
