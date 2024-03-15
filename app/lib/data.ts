import { unstable_noStore as noStore } from 'next/cache';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  User,
  Revenue,
  FormattedCustomersTable,
  LatestInvoice,
} from './definitions';
import { formatCurrency } from './utils';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function fetchRevenue() {
  // Add noStore() here to prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  noStore();

  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const data: Revenue[] = await prisma.revenue.findMany();

    console.log('Data fetch completed after 3 seconds.');

    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  noStore();
  try {
    const data = await prisma.invoice.findMany({
      include: {
        customer: true,
      },
      orderBy: { date: 'desc' },
      take: 5,
    });

    const latestInvoices = data.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  noStore();
  try {
    const invoiceCountPromise = await prisma.invoice.count();
    const customerCountPromise = await prisma.customer.count();
    const pendingSummary = await prisma.invoice.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: 'pending',
      },
    });
    const paidSummary = await prisma.invoice.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: 'paid',
      },
    });

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      pendingSummary,
      paidSummary,
    ]);

    const numberOfInvoices = Number(data[0] ?? '0');
    const numberOfCustomers = Number(data[1] ?? '0');
    const totalPaidInvoices = formatCurrency(data[2]._sum.amount! ?? 0);
    const totalPendingInvoices = formatCurrency(data[3]._sum.amount! ?? 0);

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  noStore();
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const invoices = await prisma.invoice.findMany({
      select: {
        customer: { select: { email: true, name: true, image_url: true } },
        amount: true,
        date: true,
        status: true,
        id: true,
      },

      where: {
        OR: [
          {
            customer: {
              OR: [
                { name: { contains: query } },
                { email: { contains: query } },
              ],
            },
          },
          { date: { contains: query } },
          { status: { contains: query } },
          // { amount: { equals: +query * 100 } },
        ],
      },
      take: ITEMS_PER_PAGE,
      skip: offset,
      orderBy: { date: 'desc' },
    });

    return invoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  noStore();

  try {
    const data = await prisma.customer.findFirst({
      select: {
        _count: { select: { invoices: true } },
      },
      where: {
        OR: [
          {
            name: { contains: query },
          },
          { email: { contains: query } },
          {
            invoices: {
              some: {
                OR: [
                  { date: { contains: query } },
                  { status: { contains: query } },
                  // { amount: { equals: +query * 100 } },
                ],
              },
            },
          },
        ],
      },
    });

    const totalPages = Math.ceil(
      Number(data?._count.invoices) / ITEMS_PER_PAGE,
    );
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: number) {
  noStore();
  try {
    const data = await prisma.invoice.findMany({
      where: { id: id },
      select: { amount: true, id: true, customerId: true, status: true },
    });

    const invoice = data.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
      customer_id: invoice.customerId,
    }));

    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { name: 'asc' },
    });

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  noStore();
  try {
    // const data = await prisma.customer.findMany({
    //   include: {
    //     _count: { select: { invoices: true } },
    //   },

    //   where: { name: { contains: query }, email: { contains: query } },
    //   orderBy: { name: 'asc' },
    // });

    const data: CustomersTableType[] = await prisma.$queryRaw`
    SELECT
      customers.id,
      customers.name,
      customers.email,
      customers.image_url,
      COUNT(invoices.id) AS total_invoices,
      SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
      SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
    FROM customers
    LEFT JOIN invoices ON customers.id = invoices.customer_id
    WHERE
      customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
    GROUP BY customers.id, customers.name, customers.email, customers.image_url
    ORDER BY customers.name ASC
    `;

    const customers = data.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}

export async function getUser(email: string) {
  try {
    const user: User | null = await prisma.user.findUnique({
      where: { email: email },
    });

    return user as User;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}
