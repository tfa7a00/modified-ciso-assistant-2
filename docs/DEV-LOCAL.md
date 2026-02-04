# Lancer CISO Assistant en local, développer et vérifier en parallèle

Deux façons de faire : **Docker** (rapide pour tester) ou **environnement de dev local** (idéal pour coder et voir les changements en direct).

---

## Option 1 : Tout en Docker (démarrage rapide)

Pour lancer l’app complète sans installer Python/Node en détail :

```bash
cd /home/hind/Desktop/ciso-assistant-community
./docker-compose.sh
```

- **Première fois** : le script crée la base, lance les services et te demande de créer un superuser.
- **Ensuite** : `docker compose up -d` pour démarrer, ou `docker compose up` pour voir les logs.

**Accès** : https://localhost:8443

Pour **modifier le code et voir les changements** avec cette option, il faut reconstruire les images :

```bash
./docker-compose-build.sh   # première fois
# après modification du code :
docker compose -f docker-compose-build.yml up -d --build
```

---

## Option 2 : Environnement de dev local (recommandé pour développer)

Backend (Django) et frontend (SvelteKit) tournent sur ta machine avec **rechargement à chaud** : tu modifies, tu sauvegardes, la page se met à jour.

### Prérequis

- Python 3.12+, pip, **Poetry 2.0+**
- Node 22+, **pnpm 9+**
- Optionnel : `libyaml-cpp-dev` (ex. `sudo apt install libyaml-cpp-dev`)

### 1. Backend (terminal 1)

```bash
cd /home/hind/Desktop/ciso-assistant-community/backend

# Variables d'environnement (créer ../myvars ou les exporter)
export DJANGO_DEBUG=True
export CISO_ASSISTANT_URL=http://localhost:5173

# Dépendances
poetry install

# Base de données (SQLite par défaut)
poetry run python manage.py migrate
poetry run python manage.py createsuperuser   # si pas encore fait

# Lancer le serveur (reste en avant-plan)
poetry run python manage.py runserver
```

→ API : http://127.0.0.1:8000  
→ Swagger (si `DJANGO_DEBUG=True`) : http://127.0.0.1:8000/api/schema/swagger/

### 2. Frontend (terminal 2)

```bash
cd /home/hind/Desktop/ciso-assistant-community/frontend

# L’API du backend est sur 8000 par défaut
echo "PUBLIC_BACKEND_API_URL=http://127.0.0.1:8000/api" > .env
pnpm install
pnpm run dev
```

→ App : http://localhost:5173

Tu peux garder **les deux terminaux ouverts** : backend + frontend tournent en parallèle. Modifications backend → rechargement Django ; modifications frontend → rechargement Vite/Svelte.

### 3. (Optionnel) Huey (tâches asynchrones, terminal 3)

Si tu testes des envois d’emails ou des tâches en arrière-plan :

```bash
cd /home/hind/Desktop/ciso-assistant-community/backend
poetry run python manage.py run_huey -w 2 -k process
```

---

## Vérifier tes changements en parallèle

| Où tu modifies | Où tu regardes | Rechargement |
|----------------|-----------------|--------------|
| Backend (Python/Django) | http://127.0.0.1:8000/api/… ou Swagger | Redémarrage auto du serveur Django (runserver) |
| Frontend (Svelte/TS) | http://localhost:5173 | Hot reload Vite (sans recharger toute la page) |

- **Tests backend** : dans `backend/` → `poetry run pytest`
- **Tests frontend** : dans `frontend/` → `pnpm run test` ou `pnpm run test:ci`
- **E2E** : dans `frontend/` → `tests/e2e-tests.sh`

---

## Résumé des commandes en parallèle

**Terminal 1 – Backend**

```bash
cd /home/hind/Desktop/ciso-assistant-community/backend
export DJANGO_DEBUG=True
poetry run python manage.py runserver
```

**Terminal 2 – Frontend**

```bash
cd /home/hind/Desktop/ciso-assistant-community/frontend
pnpm run dev
```

Ouvre http://localhost:5173 dans le navigateur, modifie le code, sauvegarde : tu vois le résultat en direct.
