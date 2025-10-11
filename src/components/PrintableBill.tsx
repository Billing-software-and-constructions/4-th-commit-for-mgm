import { format } from "date-fns";

interface PrintableBillProps {
  customerName: string;
  billItems: Array<{
    categoryName: string;
    subcategoryName: string;
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
    <div className="printable-bill hidden print:block print:max-w-[80mm] print:mx-auto print:bg-white print:text-black print:font-mono print:text-xs">
      {/* Header */}
      <div className="text-center mb-1">
        <h1 className="text-sm font-bold mb-0.5">MGM JEWELLERS</h1>
        <p className="text-[9px] leading-tight">
          326, 1, Rajapalayam Main Road, Gomathiyapuram,
          <br />
          Sankarankoil, Tamil Nadu 627756
        </p>
      </div>
      
      <div className="border-t border-dashed border-black my-1"></div>

      {/* Bill Info */}
      <div className="mb-1 text-[10px]">
        <div className="flex justify-between mb-0.5">
          <span>Date: {format(new Date(), "dd/MM/yyyy")}</span>
          <span>Time: {format(new Date(), "hh:mm a")}</span>
        </div>
        <div className="mb-0.5">
          <span>Customer: </span>
          <span className="font-semibold">{customerName}</span>
        </div>
        <div>
          <span>Gold Rate: </span>
          <span className="font-semibold">₹{goldRate}/gram</span>
        </div>
      </div>
      
      <div className="border-t border-dashed border-black my-1"></div>

      {/* Items Header */}
      <div className="grid grid-cols-12 gap-1 text-[9px] font-bold mb-0.5">
        <div className="col-span-4">ITEM</div>
        <div className="col-span-2 text-right">WT(g)</div>
        <div className="col-span-3 text-right">GOLD</div>
        <div className="col-span-3 text-right">SEIKULI</div>
      </div>

      {/* Items */}
      {billItems.map((item, index) => (
        <div key={index} className="mb-1">
          <div className="grid grid-cols-12 gap-1 text-[10px]">
            <div className="col-span-4 font-semibold">
              {item.categoryName} - {item.subcategoryName}
            </div>
            <div className="col-span-2 text-right">{item.weight}</div>
            <div className="col-span-3 text-right">₹{item.goldAmount.toLocaleString()}</div>
            <div className="col-span-3 text-right">
              ₹{item.seikuliAmount.toLocaleString()}
              <div className="text-[8px]">(₹{item.seikuliRate}/g)</div>
            </div>
          </div>
        </div>
      ))}

      <div className="border-t border-dashed border-black my-1"></div>

      {/* Totals */}
      <div className="space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>₹{subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>GST ({gstPercentage}%):</span>
          <span>₹{gstAmount.toLocaleString()}</span>
        </div>
        
        <div className="border-t border-black pt-0.5 mt-0.5">
          <div className="flex justify-between text-xs font-bold">
            <span>NET PAYABLE:</span>
            <span>₹{grandTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-dashed border-black my-1"></div>

      {/* Footer */}
      <div className="text-center">
        <p className="text-[10px] font-bold">THANK YOU, VISIT US AGAIN!</p>
      </div>
    </div>
  );
};
