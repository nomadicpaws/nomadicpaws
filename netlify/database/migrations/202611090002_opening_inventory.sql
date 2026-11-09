-- Owner-supplied opening counts. Never overwrite an environment already in use.
DO $$
BEGIN
  LOCK TABLE commerce_inventory, commerce_orders, commerce_stock_movements IN EXCLUSIVE MODE;
  IF NOT EXISTS (SELECT 1 FROM commerce_orders)
     AND NOT EXISTS (SELECT 1 FROM commerce_stock_movements)
     AND NOT EXISTS (SELECT 1 FROM commerce_inventory WHERE on_hand <> 0 OR reserved <> 0) THEN
    UPDATE commerce_inventory SET on_hand = CASE sku
      WHEN 'NP-PEZ-LION' THEN 10 WHEN 'NP-PEZ-NILGAI' THEN 10
      WHEN 'NP-PEZ-CARP' THEN 25 WHEN 'NP-PEZ-DEVIL' THEN 25 ELSE on_hand END;
    INSERT INTO commerce_stock_movements(request_id, sku, quantity_delta, reason)
      SELECT '18c3e2b0-49f1-4aef-8c4c-622538d89601'::uuid, sku, on_hand,
        'Opening inventory authorized by owner on 2026-11-09'
      FROM commerce_inventory WHERE on_hand > 0;
  END IF;
END $$;
