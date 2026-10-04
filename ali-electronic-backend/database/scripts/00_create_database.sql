-- Sirf SSMS me manual chalane ke liye (npm run db:setup ye khud kar deta hai)
IF DB_ID(N'AliElectronicDB') IS NULL
    CREATE DATABASE AliElectronicDB;
GO
