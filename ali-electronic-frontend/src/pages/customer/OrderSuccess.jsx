import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { orderApi } from "../../services/orderService.js";
import { formatPrice } from "../../utils/format.js";

export default function OrderSuccess() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    orderApi.get(id).then(setOrder).catch(() => {});
  }, [id]);

  return (
    <div className="container page">
      <div className="success-box">
        <i className="fa-solid fa-circle-check success-icon" />
        <h1>Shukriya! Order ho gaya</h1>
        <p className="muted">Aap ka order number <strong>#{id}</strong> hai. Hum jald aap se rabta karein ge.</p>

        {order && (
          <div className="success-items">
            {order.Items.map((i) => (
              <div key={i.Id} className="mini-item">
                <span>
                  {i.ProductName} <small>x {i.Quantity}</small>
                </span>
                <span>{formatPrice(i.Price * i.Quantity)}</span>
              </div>
            ))}
            <div className="sum-row total">
              <span>Total (Cash on Delivery)</span>
              <strong>{formatPrice(order.TotalAmount)}</strong>
            </div>
          </div>
        )}

        <div className="success-actions">
          <Link to="/orders" className="btn primary">
            <i className="fa-solid fa-box" /> My Orders
          </Link>
          <Link to="/products" className="btn">
            Shopping jari rakhein
          </Link>
        </div>
      </div>
    </div>
  );
}