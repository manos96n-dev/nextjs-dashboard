import { Metadata } from 'next';
import Image from 'next/image';
import { fetchAllCustomers } from '@/app/lib/data';
import { lusitana } from '@/app/ui/fonts';

export const metadata: Metadata = {
  title: 'Customers',
};

export default async function Page() {
  const customers = await fetchAllCustomers();

  return (
    <div className="w-full">
      <h1 className={`${lusitana.className} text-2xl`}>Customers</h1>
      <div className="mt-4 rounded-lg bg-gray-50 p-2 md:pt-0">
        <table className="hidden min-w-full text-gray-900 md:table">
          <thead className="rounded-lg text-left text-sm font-normal">
            <tr>
              <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                Customer
              </th>
              <th scope="col" className="px-3 py-5 font-medium">
                Email
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
              >
                <td className="whitespace-nowrap py-3 pl-6 pr-3">
                  <div className="flex items-center gap-3">
                    <Image
                      src={customer.image_url}
                      className="rounded-full"
                      width={28}
                      height={28}
                      alt={`${customer.name}'s profile picture`}
                    />
                    <p>{customer.name}</p>
                  </div>
                </td>
                <td className="whitespace-nowrap py-3 pl-3 pr-3">
                  {customer.email}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
