import { formatAddress, formatAmount } from "@/utils/customFn";
import { FC } from "react";
import { IoDocumentTextOutline } from "react-icons/io5";

interface IUserTable {
  transcations: ITx[];
}

const TransactionTable: FC<IUserTable> = ({ transcations }) => {
  return (
    <div className="px-4 sm:px-0">
      <div className="mt-4 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden md:rounded-lg">
              <table className="min-w-full divide-y divide-white/5">
                <thead className="bg-white/5">
                  <tr className="text-white/50">
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6"
                    >
                      Transaction Hash
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold"
                    >
                      from Address
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold"
                    >
                      to Address
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold"
                    >
                      Amount
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold"
                    >
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-white/5">
                  {/* If loading is true, show loading spinner */}

                  {/* If users is empty, show no data */}
                  {transcations.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <div className="flex justify-center items-center p-4">
                          <p className="text-white">No data found</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {transcations.length > 0 &&
                    transcations.map((tx, idx) => (
                      <tr key={idx}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                          <div className="flex items-center gap-2">
                            <div className="text-lg shrink-0">
                              <IoDocumentTextOutline />
                            </div>
                            <p className="font-medium text-primary">
                              {tx.id.substring(0, 20)}...
                            </p>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-primary">
                          {tx.inputs.length === 0
                            ? "topup"
                            : formatAddress(tx.inputs[0].address)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-primary">
                          {formatAddress(tx.outputs[0].address)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-primary">
                          {formatAmount(tx.outputs[0].amount)} BTC
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-primary">
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionTable;
