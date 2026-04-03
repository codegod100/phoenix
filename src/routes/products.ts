/**
 * Products API Route - Implementation Unit
 * Generated for Phoenix VCS
 * 
 * _phoenix: true
 */
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Database } from "bun:sqlite";

// ============================================================
// PHOENIX EXPORT CONSTANT
// ============================================================
export const _phoenix = {
  version: "1.0.0",
  generated: true,
  iu_id: "ProductsIU",
  kind: "module",
  risk_tier: "medium",
  boundary_policy: {
    dependencies: {
      code: {
        allowed_packages: ["hono", "zod", "@hono/zod-validator"],
      },
      side_channels: {
        databases: ["products.db"],
      },
    },
  },
  evidence_policy: ["typecheck", "unit_tests"],
} as const;

// ============================================================
// ZOD SCHEMAS
// ============================================================
const ProductSchema = z.object({
  name: z.string().min(1).max(255),
  price: z.number().positive(),
});

const ProductUpdateSchema = ProductSchema.partial();

const ProductResponseSchema = ProductSchema.extend({
  id: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Types inferred from schemas
export type Product = z.infer<typeof ProductSchema>;
export type ProductUpdate = z.infer<typeof ProductUpdateSchema>;
export type ProductResponse = z.infer<typeof ProductResponseSchema>;

// ============================================================
// DATABASE SETUP (bun:sqlite)
// ============================================================
const DB_PATH = process.env.PRODUCTS_DB_PATH || "products.db";

function getDb(): Database {
  const db = new Database(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  return db;
}

// Initialize table
export function initProductsTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL CHECK(price > 0),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.close();
}

// ============================================================
// DATABASE OPERATIONS
// ============================================================
export function createProduct(product: Product): ProductResponse {
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO products (name, price) VALUES ($name, $price) RETURNING *"
  );
  const result = stmt.get({
    $name: product.name,
    $price: product.price,
  }) as ProductResponse;
  db.close();
  return result;
}

export function getProductById(id: number): ProductResponse | null {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM products WHERE id = $id");
  const result = stmt.get({ $id: id }) as ProductResponse | null;
  db.close();
  return result;
}

export function getAllProducts(): ProductResponse[] {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM products ORDER BY created_at DESC");
  const results = stmt.all() as ProductResponse[];
  db.close();
  return results;
}

export function updateProduct(
  id: number,
  updates: ProductUpdate
): ProductResponse | null {
  const db = getDb();
  
  // Build dynamic update query
  const fields: string[] = [];
  const values: Record<string, unknown> = { $id: id };
  
  if (updates.name !== undefined) {
    fields.push("name = $name");
    values.$name = updates.name;
  }
  if (updates.price !== undefined) {
    fields.push("price = $price");
    values.$price = updates.price;
  }
  
  if (fields.length === 0) {
    db.close();
    return getProductById(id);
  }
  
  fields.push("updated_at = CURRENT_TIMESTAMP");
  
  const query = `UPDATE products SET ${fields.join(", ")} WHERE id = $id RETURNING *`;
  const stmt = db.prepare(query);
  const result = stmt.get(values) as ProductResponse | null;
  db.close();
  return result;
}

export function deleteProduct(id: number): boolean {
  const db = getDb();
  const stmt = db.prepare("DELETE FROM products WHERE id = $id");
  const info = stmt.run({ $id: id });
  db.close();
  return info.changes > 0;
}

// ============================================================
// HONO ROUTES
// ============================================================
export const productsRouter = new Hono();

// GET /products - List all products
productsRouter.get("/", (c) => {
  const products = getAllProducts();
  return c.json(
    {
      success: true,
      data: products,
      count: products.length,
    },
    200
  );
});

// GET /products/:id - Get single product
productsRouter.get("/:id", (c) => {
  const id = Number(c.req.param("id"));
  
  if (isNaN(id)) {
    return c.json(
      {
        success: false,
        error: "Invalid product ID",
      },
      400
    );
  }
  
  const product = getProductById(id);
  
  if (!product) {
    return c.json(
      {
        success: false,
        error: "Product not found",
      },
      404
    );
  }
  
  return c.json(
    {
      success: true,
      data: product,
    },
    200
  );
});

// POST /products - Create product
productsRouter.post(
  "/",
  zValidator("json", ProductSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: "Validation failed",
          details: result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        400
      );
    }
  }),
  (c) => {
    const data = c.req.valid("json");
    const product = createProduct(data);
    
    return c.json(
      {
        success: true,
        data: product,
        message: "Product created successfully",
      },
      201
    );
  }
);

// PATCH /products/:id - Update product
productsRouter.patch(
  "/:id",
  zValidator("json", ProductUpdateSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: "Validation failed",
          details: result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        400
      );
    }
  }),
  (c) => {
    const id = Number(c.req.param("id"));
    
    if (isNaN(id)) {
      return c.json(
        {
          success: false,
          error: "Invalid product ID",
        },
        400
      );
    }
    
    // Check if product exists
    const existing = getProductById(id);
    if (!existing) {
      return c.json(
        {
          success: false,
          error: "Product not found",
        },
        404
      );
    }
    
    const data = c.req.valid("json");
    const product = updateProduct(id, data);
    
    return c.json(
      {
        success: true,
        data: product,
        message: "Product updated successfully",
      },
      200
    );
  }
);

// DELETE /products/:id - Delete product
productsRouter.delete("/:id", (c) => {
  const id = Number(c.req.param("id"));
  
  if (isNaN(id)) {
    return c.json(
      {
        success: false,
        error: "Invalid product ID",
      },
      400
    );
  }
  
  // Check if product exists
  const existing = getProductById(id);
  if (!existing) {
    return c.json(
      {
        success: false,
        error: "Product not found",
      },
      404
    );
  }
  
  const deleted = deleteProduct(id);
  
  if (!deleted) {
    return c.json(
      {
        success: false,
        error: "Failed to delete product",
      },
      500
    );
  }
  
  return c.json(
    {
      success: true,
      message: "Product deleted successfully",
      data: { id },
    },
    200
  );
});

// ============================================================
// MAIN APP EXPORT (optional - for direct use)
// ============================================================
export function createProductsApp(): Hono {
  initProductsTable();
  const app = new Hono();
  app.route("/products", productsRouter);
  return app;
}

export default productsRouter;
