import { useState } from "react";
import axios from "axios";
import AsyncSelect from "react-select/async";
import JsBarcode from "jsbarcode";
import { jsPDF } from "jspdf";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { toast } from "react-hot-toast";

function BarcodeGenerator() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [labelCount, setLabelCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load options for AsyncSelect
  const loadProductOptions = async (inputValue) => {
    try {
      const res = await axios.get(
        `/api/products?page=1&limit=20&search=${inputValue}`
      );
      return res.data.products.map((p) => ({
        value: p.id,
        label: `${p.sku} - ${p.name}`,
        sku: p.sku,
        name: p.name,
        price: p.selling_price,
      }));
    } catch (err) {
      return [];
    }
  };

  const generatePDF = () => {
    if (!selectedProduct) {
      toast.error("Pilih produk terlebih dahulu!");
      return;
    }

    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Label Dimensions (e.g., 3x7 grid or custom size)
      // Let's assume a standard A4 page with labels 63.5mm x 38.1mm (21 per page, 3x7)
      const labelWidth = 63.5;
      const labelHeight = 38.1;
      const marginX = 10;
      const marginY = 12;
      const cols = 3;
      const rows = 7;

      let col = 0;
      let row = 0;

      for (let i = 0; i < labelCount; i++) {
        // Position
        const x = marginX + col * labelWidth;
        const y = marginY + row * labelHeight;

        // Draw Border (Optional, helpful for cutting)
        doc.setDrawColor(200);
        doc.setLineWidth(0.1);
        doc.rect(x, y, labelWidth, labelHeight);

        // Content
        doc.setFontSize(10);
        doc.text(
          doc.splitTextToSize(selectedProduct.name, labelWidth - 4),
          x + 2,
          y + 5
        );

        doc.setFontSize(8);
        doc.text(
          `Price: Rp ${parseFloat(selectedProduct.price).toLocaleString()}`,
          x + 2,
          y + 10
        );

        // Generate Barcode on Canvas
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, selectedProduct.sku, {
          format: "CODE128",
          displayValue: true,
          fontSize: 14,
          height: 30,
          width: 2,
          margin: 0,
        });
        const barcodeData = canvas.toDataURL("image/jpeg");

        // Add Barcode Image to PDF
        // x + 2 (margin), y + 12 (below text), width: labelWidth - 4, height: 20
        doc.addImage(barcodeData, "JPEG", x + 2, y + 12, labelWidth - 4, 20);

        // Update Grid Position
        col++;
        if (col >= cols) {
          col = 0;
          row++;
          if (row >= rows && i < labelCount - 1) {
            doc.addPage();
            row = 0;
          }
        }
      }

      doc.save(`labels-${selectedProduct.sku}.pdf`);
      toast.success("PDF Label berhasil diunduh!");
    } catch (err) {
      console.error(err);
      toast.error("Gagal membuat PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600 mb-2">
          🖨️ Cetak Label & Barcode
        </h1>
        <p className="text-gray-500 mb-8">
          Buat label produk siap cetak (PDF A4).
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Pilih Produk
            </label>
            <AsyncSelect
              cacheOptions
              loadOptions={loadProductOptions}
              defaultOptions
              onChange={setSelectedProduct}
              placeholder="Cari nama atau SKU produk..."
              className="text-sm"
              classNames={{
                control: (state) =>
                  "p-1.5 border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 hover:border-gray-400",
              }}
            />
          </div>

          <div>
            <Input
              label="Jumlah Label"
              type="number"
              min="1"
              max="1000"
              value={labelCount}
              onChange={(e) => setLabelCount(parseInt(e.target.value) || 1)}
            />
            <p className="text-xs text-gray-400 mt-1">
              Estimasi: {Math.ceil(labelCount / 21)} halaman A4 (3x7 per
              halaman).
            </p>
          </div>

          <div className="pt-4 flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-100">
            {selectedProduct ? (
              <div>
                <p className="text-sm font-bold text-gray-800">
                  {selectedProduct.name}
                </p>
                <p className="text-xs font-mono text-gray-500">
                  {selectedProduct.sku}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">
                Belum ada produk dipilih.
              </p>
            )}

            <Button
              variant="primary"
              onClick={generatePDF}
              disabled={!selectedProduct || isGenerating}
              isLoading={isGenerating}
              size="lg"
              className="shadow-md hover:shadow-lg transition-all"
            >
              Print PDF
            </Button>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-100 pt-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">
            Preview Barcode (Single)
          </h3>
          <div className="flex justify-center p-6 bg-white border-2 border-dashed border-gray-200 rounded-xl">
            {selectedProduct ? (
              <div className="text-center">
                <p className="text-xs mb-1">{selectedProduct.name}</p>
                <svg
                  id="barcode-preview"
                  ref={(node) => {
                    if (node && selectedProduct) {
                      JsBarcode(node, selectedProduct.sku, {
                        format: "CODE128",
                        width: 2,
                        height: 50,
                        displayValue: true,
                      });
                    }
                  }}
                ></svg>
              </div>
            ) : (
              <div className="text-gray-300">Preview akan muncul di sini</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BarcodeGenerator;
