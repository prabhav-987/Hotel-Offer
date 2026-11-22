import { Router } from 'express';
import { SupplierHotel, SupplierId } from '../types';

const DATA: Record<SupplierId, SupplierHotel[]> = {
  A: [
    { hotelId: 'a1', name: 'Holtin', price: 6000, city: 'delhi', commissionPct: 10 },
    { hotelId: 'a2', name: 'Radison', price: 5900, city: 'delhi', commissionPct: 13 },
    { hotelId: 'a3', name: 'Lemon Tree', price: 4200, city: 'delhi', commissionPct: 12 },
    { hotelId: 'a4', name: 'Taj Palace', price: 14500, city: 'delhi', commissionPct: 8 },
    { hotelId: 'a5', name: 'Trident', price: 9800, city: 'mumbai', commissionPct: 11 },
  ],
  B: [
    { hotelId: 'b1', name: 'Holtin', price: 5340, city: 'delhi', commissionPct: 20 },
    { hotelId: 'b2', name: 'Radison', price: 6200, city: 'delhi', commissionPct: 15 },
    { hotelId: 'b3', name: 'Ibis', price: 3900, city: 'delhi', commissionPct: 18 },
    { hotelId: 'b4', name: 'Taj Palace', price: 14100, city: 'delhi', commissionPct: 9 },
    { hotelId: 'b5', name: 'Trident', price: 9500, city: 'mumbai', commissionPct: 14 },
  ],
};

// In-memory switch used to simulate a supplier outage.
const down: Record<SupplierId, boolean> = { A: false, B: false };

export const supplierRouter = Router();

for (const id of ['A', 'B'] as const) {
  supplierRouter.get(`/supplier${id}/hotels`, (req, res) => {
    if (down[id]) {
      res.status(503).json({ error: `Supplier ${id} is down` });
      return;
    }
    const city = String(req.query.city ?? '').trim().toLowerCase();
    res.json(city ? DATA[id].filter((h) => h.city === city) : DATA[id]);
  });
}

// POST /admin/supplier/A/down?value=true  -> simulate outage (value=false restores)
supplierRouter.post('/admin/supplier/:id/down', (req, res) => {
  const id = req.params.id.toUpperCase();
  if (id !== 'A' && id !== 'B') {
    res.status(400).json({ error: 'id must be A or B' });
    return;
  }
  down[id] = String(req.query.value ?? 'true') === 'true';
  res.json({ supplier: id, down: down[id] });
});
