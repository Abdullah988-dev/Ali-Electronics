# Ali Electronic

Folders:
- `ali-electronic-frontend`  -> React + Vite  -> http://localhost:5172
- `ali-electronic-backend`   -> Node + Express -> http://localhost:5001
- Database: local SQL Server (`AliElectronicDB`)

## Pehli baar setup

### 1) SQL Server
Is project me local **(localdb)\MSSQLLocalDB** + **Windows Authentication** use ho raha hai (jo SSMS me connect hota hai).
Is ke liye backend `.env` me `DB_AUTH=windows` aur `DB_SERVER=(localdb)\MSSQLLocalDB` hai, user/password ki zarurat nahi.
(Live hosting par `DB_AUTH=sql` kar ke DB_SERVER/USER/PASSWORD bharein.)

### 2) Backend
```
cd ali-electronic-backend
npm install
```
`.env` already LocalDB ke liye set hai. Agar 'ODBC driver' ka error aaye to `DB_ODBC_DRIVER` me apne installed driver ka naam likhein.

```
npm run db:setup     (database + tables + views + trigger banata hai)
npm run seed:admin   (pehla admin user banata hai)
npm run dev
```
Test: http://localhost:5001/api/health  aur  http://localhost:5001/api/health/db

### 3) Frontend
```
cd ali-electronic-frontend
npm install
npm run dev
```
Browser: http://localhost:5172  (hero animation + Backend/SQL status dikhe ga)

## Stock ka rule
Baaki maal = total StockIn - total StockOut (`vw_ProductStock` view).
Website par product admin me add + published ho aur management me stock > 0 ho to "In Stock", warna "Out of Stock".

## Live karte waqt
Sirf `.env` files badlein (DB_SERVER/USER/PASSWORD, CLIENT_URL, VITE_API_URL, VITE_SERVER_URL, JWT_SECRET).
