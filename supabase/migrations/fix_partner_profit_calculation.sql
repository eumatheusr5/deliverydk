-- ============================================
-- CORREÇÃO: Cálculo do lucro do parceiro
-- ============================================
-- O lucro do parceiro é calculado como:
-- Preço de venda (definido pelo parceiro) - Preço de custo (definido pelo admin)
-- 
-- Exemplo:
-- - Preço de custo: R$ 20,00 (lucro do admin)
-- - Preço de venda: R$ 28,00 (definido pelo parceiro)
-- - Lucro do parceiro: R$ 8,00 (28 - 20)
-- ============================================

-- Remover a coluna de comissão (não é mais usada)
ALTER TABLE payment_settings DROP COLUMN IF EXISTS partner_commission_percent;

-- Recriar a função para calcular o lucro do parceiro corretamente
CREATE OR REPLACE FUNCTION credit_partner_sale_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
  v_partner_id UUID;
  v_partner_profit DECIMAL(10,2) := 0;
  v_item RECORD;
  v_product_cost DECIMAL(10,2);
BEGIN
  -- Só executa quando o status muda para 'delivered'
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    v_partner_id := NEW.partner_id;
    
    -- Se não tem parceiro, ignora
    IF v_partner_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Calcular o lucro do parceiro para cada item
    -- Lucro = (preço de venda - preço de custo) * quantidade
    FOR v_item IN 
      SELECT oi.product_id, oi.unit_price, oi.quantity
      FROM order_items oi
      WHERE oi.order_id = NEW.id
    LOOP
      -- Buscar preço de custo do produto (price na tabela products)
      SELECT COALESCE(price, 0) INTO v_product_cost
      FROM products WHERE id = v_item.product_id;
      
      -- Lucro do parceiro = (preço de venda - preço de custo) * quantidade
      v_partner_profit := v_partner_profit + ((v_item.unit_price - v_product_cost) * v_item.quantity);
    END LOOP;
    
    -- Só processa se houver lucro positivo
    IF v_partner_profit > 0 THEN
      -- Verificar se já existe registro de saldo para o parceiro
      IF NOT EXISTS (SELECT 1 FROM partner_balances WHERE partner_id = v_partner_id) THEN
        INSERT INTO partner_balances (partner_id, available_balance, pending_balance, total_earned, total_withdrawn)
        VALUES (v_partner_id, 0, v_partner_profit, v_partner_profit, 0);
      ELSE
        -- Adicionar ao saldo pendente (será liberado após X dias)
        UPDATE partner_balances
        SET pending_balance = pending_balance + v_partner_profit,
            total_earned = total_earned + v_partner_profit,
            updated_at = NOW()
        WHERE partner_id = v_partner_id;
      END IF;
      
      -- Registrar transação no histórico
      INSERT INTO partner_transactions (partner_id, type, amount, balance_after, reference_id, description)
      VALUES (
        v_partner_id,
        'sale',
        v_partner_profit,
        (SELECT available_balance + pending_balance FROM partner_balances WHERE partner_id = v_partner_id),
        NEW.id,
        'Venda #' || NEW.order_number || ' - Lucro: R$ ' || v_partner_profit::TEXT
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que o trigger existe
DROP TRIGGER IF EXISTS tr_credit_partner_sale_on_delivery ON orders;
CREATE TRIGGER tr_credit_partner_sale_on_delivery
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION credit_partner_sale_on_delivery();

