import { format } from "date-fns";

interface PrintableBillProps {
  customerName: string;
  billItems: Array<{
    categoryName: string;
    weight: number;
    goldAmount: number;
    seikuliAmount: number;
    seikuliRate: number;
  }>;
  goldRate: number;
  gstPercentage: number;
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
}

export const PrintableBill = ({
  customerName,
  billItems,
  goldRate,
  gstPercentage,
  subtotal,
  gstAmount,
  grandTotal,
}: PrintableBillProps) => {
  return (
    <div className="printable-bill hidden print:block print:max-w-[80mm] print:mx-auto print:p-4 print:bg-white print:text-black print:font-mono print:text-xs">
      {/* Header */}
      <div className="text-center mb-2">
        <h1 className="text-base font-bold mb-1">MGM JEWELLERS</h1>
        <p className="text-[10px] leading-tight">
          326, 1, Rajapalayam Main Road, Gomathiyapuram,
          <br />
          Sankarankoil, Tamil Nadu 627756
        </p>
      </div>
      
      <div className="border-t-2 border-dashed border-black my-2"></div>

      {/* Bill Info */}
      <div className="mb-2 text-[11px]">
        <div className="flex justify-between mb-1">
          <span>Date: {format(new Date(), "dd/MM/yyyy")}</span>
          <span>Time: {format(new Date(), "hh:mm a")}</span>
        </div>
        <div className="mb-1">
          <span>Customer: </span>
          <span className="font-semibold">{customerName}</span>
        </div>
        <div>
          <span>Gold Rate: </span>
          <span className="font-semibold">₹{goldRate}/gram</span>
        </div>
      </div>
      
      <div className="border-t border-dashed border-black my-2"></div>

      {/* Items Header */}
      <div className="grid grid-cols-12 gap-1 text-[10px] font-bold mb-1">
        <div className="col-span-4">ITEM</div>
        <div className="col-span-2 text-right">WT(g)</div>
        <div className="col-span-3 text-right">GOLD</div>
        <div className="col-span-3 text-right">SEIKULI</div>
      </div>

      {/* Items */}
      {billItems.map((item, index) => (
        <div key={index} className="mb-2">
          <div className="grid grid-cols-12 gap-1 text-[11px]">
            <div className="col-span-4 font-semibold">{item.categoryName}</div>
            <div className="col-span-2 text-right">{item.weight}</div>
            <div className="col-span-3 text-right">₹{item.goldAmount.toLocaleString()}</div>
            <div className="col-span-3 text-right">
              ₹{item.seikuliAmount.toLocaleString()}
              <div className="text-[9px]">(₹{item.seikuliRate}/g)</div>
            </div>
          </div>
        </div>
      ))}

      <div className="border-t border-dashed border-black my-2"></div>

      {/* Totals */}
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>₹{subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>GST ({gstPercentage}%):</span>
          <span>₹{gstAmount.toLocaleString()}</span>
        </div>
        
        <div className="border-t-2 border-black pt-1 mt-1">
          <div className="flex justify-between text-[13px] font-bold">
            <span>NET PAYABLE:</span>
            <span>₹{grandTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-dashed border-black my-2"></div>

      {/* Footer */}
      <div className="text-center">
        <p className="text-[11px] font-bold">THANK YOU, VISIT US AGAIN!</p>
      </div>
    </div>
  );
};
