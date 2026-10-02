import { PrismaClient, ProductCategory, ProductUnit, TransactionType, UserRole } from "@prisma/client";
import * as argon2 from "argon2";
import { ALL_PERMISSIONS, ROLE_PERMISSIONS } from "../src/common/permissions";

const prisma = new PrismaClient();
const DEV_PASSWORD = "ChangeMe123!";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed development accounts when NODE_ENV is production.");
  }
  const passwordHash = await argon2.hash(DEV_PASSWORD);

  for (const permission of ALL_PERMISSIONS) {
    await prisma.permission.upsert({ where: { key: permission.key }, update: { description: permission.description }, create: permission });
  }
  const roleDescriptions: Record<UserRole, string> = {
    ADMIN: "Full system access",
    MANAGER: "Operational management without user administration",
    STAFF: "Day-to-day recording without administrative access",
  };
  for (const name of Object.values(UserRole)) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { description: roleDescriptions[name] },
      create: { name, description: roleDescriptions[name] },
    });
    const keys = ROLE_PERMISSIONS[name];
    const permissions = await prisma.permission.findMany({ where: { key: { in: keys } } });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({ data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })) });
  }

  const users = [
    ["Amina Kato", "admin@example.com", UserRole.ADMIN],
    ["David Okello", "manager@example.com", UserRole.MANAGER],
    ["Sarah Namukasa", "staff@example.com", UserRole.STAFF],
  ] as const;
  for (const [fullName, email, roleName] of users) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    await prisma.user.upsert({
      where: { email },
      update: { fullName, passwordHash, roleId: role.id, status: "ACTIVE", mustChangePassword: false },
      create: { fullName, email, passwordHash, roleId: role.id, emailVerified: true },
    });
  }

  const locationData = [
    ["Mukono", "Mukono", "Central", 28.6],
    ["Jinja", "Jinja", "Eastern", 81],
    ["Entebbe", "Wakiso", "Central", 40],
    ["Mbale", "Mbale", "Eastern", 225],
    ["Mbarara", "Mbarara", "Western", 270],
  ] as const;
  const locations = [];
  for (const [name, district, region, distanceKm] of locationData) {
    const existing = await prisma.location.findFirst({ where: { name } });
    locations.push(existing ?? (await prisma.location.create({ data: { name, district, region, distanceKm } })));
  }

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@example.com" } });
  const clientNames = ["Nile Harvest Traders", "Lakeview Grocers", "Highland Millers", "Sunrise Distributors", "Green Valley Stores", "Kampala Basket Co", "Riverbend Wholesale", "Savanna Retail", "Pearl Grain Buyers", "Equator Foods"];
  const clients = [];
  for (let index = 0; index < clientNames.length; index += 1) {
    const clientCode = `CL-${String(index + 1).padStart(6, "0")}`;
    const location = locations[index % locations.length];
    clients.push(await prisma.client.upsert({
      where: { clientCode },
      update: {},
      create: {
        clientCode,
        name: clientNames[index],
        contactPerson: `Contact ${index + 1}`,
        phone: `+256700000${String(index + 1).padStart(3, "0")}`,
        email: `client${index + 1}@example.com`,
        locationId: location.id,
        distanceKm: location.distanceKm,
        clientType: index % 2 === 0 ? "BUSINESS" : "DISTRIBUTOR",
      },
    }));
  }

  const supplierNames = ["Source Farm Collective", "Eastern Grain Supplies", "Makerere Inputs", "Western Raw Mills", "Individual Grower Desk"];
  const supplierTypes = ["FARMER", "DISTRIBUTOR", "MANUFACTURER", "BUSINESS", "INDIVIDUAL"] as const;
  const suppliers = [];
  for (let index = 0; index < supplierNames.length; index += 1) {
    const supplierCode = `SUP-${String(index + 1).padStart(6, "0")}`;
    const location = locations[index];
    suppliers.push(await prisma.supplier.upsert({
      where: { supplierCode },
      update: {},
      create: {
        supplierCode,
        name: supplierNames[index],
        contactPerson: `Buyer desk ${index + 1}`,
        phone: `+256701000${String(index + 1).padStart(3, "0")}`,
        email: `supplier${index + 1}@example.com`,
        locationId: location.id,
        distanceKm: location.distanceKm,
        supplierType: supplierTypes[index],
      },
    }));
  }

  const productSpecs = [
    ["PRD-000001", "Finished Product A", "FINISHED_PRODUCT", "KG"],
    ["PRD-000002", "Finished Product B", "FINISHED_PRODUCT", "TONNE"],
    ["PRD-000003", "Finished Product C", "FINISHED_PRODUCT", "KG"],
    ["MAT-000001", "Raw Material A", "RAW_MATERIAL", "KG"],
    ["OTH-000001", "Packing Pieces", "OTHER", "PIECE"],
  ] as const;
  const products = [];
  for (const [productCode, name, category, unit] of productSpecs) {
    products.push(await prisma.product.upsert({
      where: { productCode },
      update: {},
      create: { productCode, name, category: category as ProductCategory, unit: unit as ProductUnit, description: "Fictional development product" },
    }));
  }

  const sequences = [
    ["client", "CL", 11],
    ["supplier", "SUP", 6],
    ["product_finished", "PRD", 4],
    ["product_raw", "MAT", 2],
    ["product_other", "OTH", 2],
    ["transaction", "TXN", 33],
  ] as const;
  for (const [id, prefix, nextValue] of sequences) {
    await prisma.codeSequence.upsert({ where: { id }, update: { prefix, nextValue }, create: { id, prefix, nextValue } });
  }

  const existingTransactions = await prisma.transaction.count();
  if (existingTransactions === 0) {
    const weekly = ["2026-09-02", "2026-09-09", "2026-09-16", "2026-09-23"];
    let number = 1;
    for (const date of weekly) {
      await prisma.transaction.create({
        data: {
          transactionCode: `TXN-${String(number).padStart(6, "0")}`,
          transactionType: TransactionType.CLIENT_PURCHASE,
          clientId: clients[0].id,
          productId: products[0].id,
          quantityKg: 1500,
          inputQuantity: 1500,
          inputUnit: ProductUnit.KG,
          transactionDate: new Date(date),
          referenceNumber: `REF-${number}`,
          recordedById: admin.id,
        },
      });
      number += 1;
    }
    for (let index = 0; index < 28; index += 1) {
      const purchase = index % 3 !== 0;
      const day = new Date(Date.UTC(2026, index % 8, (index % 27) + 1));
      await prisma.transaction.create({
        data: {
          transactionCode: `TXN-${String(number).padStart(6, "0")}`,
          transactionType: purchase ? TransactionType.CLIENT_PURCHASE : TransactionType.SUPPLIER_SUPPLY,
          clientId: purchase ? clients[index % clients.length].id : null,
          supplierId: purchase ? null : suppliers[index % suppliers.length].id,
          productId: products[index % 4].id,
          quantityKg: 500 + index * 25,
          inputQuantity: index % 4 === 1 ? (500 + index * 25) / 1000 : 500 + index * 25,
          inputUnit: index % 4 === 1 ? ProductUnit.TONNE : ProductUnit.KG,
          transactionDate: day,
          referenceNumber: `REF-${number}`,
          recordedById: admin.id,
        },
      });
      number += 1;
    }
  }

  console.info("Development seed completed. Accounts use the documented development password and example.com addresses.");
}

main().finally(async () => {
  await prisma.$disconnect();
});
