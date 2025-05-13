import { NextResponse } from 'next/server'
import postgres from 'postgres'
import { users, customers, invoices, revenue } from '../lib/placeholder-data'

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' })

async function seedUsers() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `

  return Promise.all(
    users.map(async (u) => {
      const { default: bcrypt } = await import('bcryptjs')
      const hash = await bcrypt.hash(u.password, 10)
      return sql`
        INSERT INTO users (id, name, email, password)
        VALUES (${u.id}, ${u.name}, ${u.email}, ${hash})
        ON CONFLICT (id) DO NOTHING
      `
    }),
  )
}

async function seedCustomers() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`
  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    )
  `

  return Promise.all(
    customers.map((c) =>
      sql`
        INSERT INTO customers (id, name, email, image_url)
        VALUES (${c.id}, ${c.name}, ${c.email}, ${c.image_url})
        ON CONFLICT (id) DO NOTHING
      `,
    ),
  )
}

async function seedInvoices() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`
  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      customer_id UUID NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    )
  `

  return Promise.all(
    invoices.map((i) =>
      sql`
        INSERT INTO invoices (id, customer_id, amount, status, date)
        VALUES (uuid_generate_v4(), ${i.customer_id}, ${i.amount}, ${i.status}, ${i.date})
        ON CONFLICT (id) DO NOTHING
      `,
    ),
  )
}

async function seedRevenue() {
  await sql`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    )
  `

  return Promise.all(
    revenue.map((r) =>
      sql`
        INSERT INTO revenue (month, revenue)
        VALUES (${r.month}, ${r.revenue})
        ON CONFLICT (month) DO NOTHING
      `,
    ),
  )
}

export async function GET() {
  try {
    await sql.begin(async (tx) => {
      await seedUsers()
      await seedCustomers()
      await seedInvoices()
      await seedRevenue()
    })
    return NextResponse.json({ success: true, message: 'Database seeded successfully' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
