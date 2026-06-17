import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { ALL } from "../lib/store.js";
import { histogram, median } from "../lib/analytics.js";
import { fmtMoneyShort, fmtMoney } from "../lib/format.js";

export default function Markets() {
  const priceRef = useRef(null), psfRef = useRef(null), domRef = useRef(null), trendRef = useRef(null);

  useEffect(() => {
    const opts = {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#6b7689", font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: "#6b7689", font: { size: 10 } }, grid: { color: "#e2e8f2" } },
      },
    };
    const charts = [];

    const priceH = histogram(ALL.map((l) => l.price), 8, (v) => fmtMoneyShort(v));
    charts.push(new Chart(priceRef.current, { type: "bar",
      data: { labels: priceH.map((b) => b.label), datasets: [{ data: priceH.map((b) => b.count), backgroundColor: "#4f46e5" }] }, options: opts }));

    const byCity = {};
    for (const l of ALL) (byCity[l.city] ||= []).push(l.psf);
    const cities = Object.keys(byCity);
    charts.push(new Chart(psfRef.current, { type: "bar",
      data: { labels: cities, datasets: [{ data: cities.map((c) => Math.round(median(byCity[c]))), backgroundColor: "#10b981" }] }, options: opts }));

    const domH = histogram(ALL.map((l) => l.daysOnMarket), 6, (v) => Math.round(v) + "d");
    charts.push(new Chart(domRef.current, { type: "bar",
      data: { labels: domH.map((b) => b.label), datasets: [{ data: domH.map((b) => b.count), backgroundColor: "#f59e0b" }] }, options: opts }));

    const med = median(ALL.map((l) => l.price));
    const factors = [0.93, 0.94, 0.945, 0.955, 0.96, 0.97, 0.975, 0.985, 0.99, 0.995, 1.0, 1.005];
    const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    charts.push(new Chart(trendRef.current, { type: "line",
      data: { labels: months, datasets: [{ data: factors.map((f) => Math.round(med * f)), borderColor: "#4f46e5", backgroundColor: "rgba(79,70,229,0.12)", fill: true, tension: 0.35, pointRadius: 2 }] }, options: opts }));

    return () => charts.forEach((c) => c.destroy());
  }, []);

  return (
    <section className="page">
      <h1 className="page-title">Markets &amp; dynamics</h1>
      <p className="muted-inline">Analytics across {ALL.length} listings in 5 U.S. metros · median {fmtMoney(median(ALL.map((l) => l.price)))}.</p>
      <div className="charts-grid">
        <div className="chart-box"><h3>Listings by price</h3><canvas ref={priceRef}></canvas></div>
        <div className="chart-box"><h3>Median $/sqft by city</h3><canvas ref={psfRef}></canvas></div>
        <div className="chart-box"><h3>Days on market</h3><canvas ref={domRef}></canvas></div>
        <div className="chart-box"><h3>Price trend (12 mo, illustrative)</h3><canvas ref={trendRef}></canvas></div>
      </div>
    </section>
  );
}
