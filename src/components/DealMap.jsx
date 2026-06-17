import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.heat";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { CAT_COLOR } from "../lib/format.js";
import { fmtMoney } from "../lib/format.js";

const HEAT_GRAD = { 0.0: "#2e9e5b", 0.45: "#9ccc3b", 0.65: "#f2c528", 0.82: "#f2882e", 1.0: "#e0392b" };
const BASE = {
  light: { url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", attr: "&copy; OpenStreetMap &copy; CARTO", max: 19 },
  satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr: "&copy; Esri", max: 19 },
};

// Bubble radius scales with deal score (proportional symbols).
const bubbleR = (l) => 4 + (l.dealScore / 100) * 9;

function clusterIcon(cluster) {
  const n = cluster.getChildCount();
  const size = n < 10 ? 34 : n < 50 ? 40 : 48;
  return L.divIcon({
    html: `<div class="ml-cluster" style="width:${size}px;height:${size}px"><span>${n}</span></div>`,
    className: "ml-cluster-wrap",
    iconSize: [size, size],
  });
}

export default function DealMap({ listings, heatOn, heatMode, basemap = "light", onSelect, center, zoom, areaDrawMode, area, onMapClick }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const baseRef = useRef(null);
  const clusterRef = useRef(null);
  const heatRef = useRef(null);
  const circleRef = useRef(null);
  const clickRef = useRef(onMapClick);
  clickRef.current = onMapClick;

  useEffect(() => {
    const map = L.map(elRef.current, { zoomControl: true }).setView(center || [39.5, -98.35], zoom || 4);
    const b = BASE[basemap] || BASE.light;
    baseRef.current = L.tileLayer(b.url, { maxZoom: b.max, attribution: b.attr }).addTo(map);
    clusterRef.current = L.markerClusterGroup({ maxClusterRadius: 50, showCoverageOnHover: false, iconCreateFunction: clusterIcon });
    map.addLayer(clusterRef.current);
    map.on("click", (e) => clickRef.current && clickRef.current(e.latlng.lat, e.latlng.lng));
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 60);
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(elRef.current);
    return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
  }, []);

  // basemap switch
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (baseRef.current) map.removeLayer(baseRef.current);
    const b = BASE[basemap] || BASE.light;
    baseRef.current = L.tileLayer(b.url, { maxZoom: b.max, attribution: b.attr }).addTo(map);
    baseRef.current.bringToBack();
  }, [basemap]);

  useEffect(() => {
    if (mapRef.current) mapRef.current.getContainer().style.cursor = areaDrawMode ? "crosshair" : "";
  }, [areaDrawMode]);

  // clustered proportional markers
  useEffect(() => {
    const cl = clusterRef.current;
    if (!cl) return;
    cl.clearLayers();
    const markers = listings.map((l) => {
      const m = L.circleMarker([l.lat, l.lng], {
        radius: bubbleR(l), color: "#fff", weight: 1.5, fillColor: CAT_COLOR[l.category], fillOpacity: 0.9,
      });
      m.bindTooltip(`${fmtMoney(l.price)} · deal ${l.dealScore}`, { direction: "top" });
      m.on("click", () => onSelect(l.id));
      return m;
    });
    cl.addLayers(markers);
  }, [listings, onSelect]);

  // heat overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (heatRef.current) { map.removeLayer(heatRef.current); heatRef.current = null; }
    if (!heatOn || !listings.length) return;
    const val = (l) => (heatMode === "activity" ? l.activityScore : l.psf);
    const vals = listings.map(val);
    const min = Math.min(...vals), max = Math.max(...vals), span = (max - min) || 1;
    const pts = listings.map((l) => [l.lat, l.lng, 0.4 + 0.6 * ((val(l) - min) / span)]);
    heatRef.current = L.heatLayer(pts, { radius: 34, blur: 20, minOpacity: 0.45, gradient: HEAT_GRAD }).addTo(map);
  }, [heatOn, heatMode, listings]);

  // area circle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!area) { if (circleRef.current) { map.removeLayer(circleRef.current); circleRef.current = null; } return; }
    if (circleRef.current) circleRef.current.setLatLng([area.lat, area.lng]).setRadius(area.radius);
    else circleRef.current = L.circle([area.lat, area.lng], { radius: area.radius, color: "#4f46e5", weight: 1.5, fillColor: "#4f46e5", fillOpacity: 0.1 }).addTo(map);
  }, [area]);

  useEffect(() => { const map = mapRef.current; if (map && center) map.setView(center, zoom || 12, { animate: true }); }, [center, zoom]);

  return <div ref={elRef} style={{ height: "100%", width: "100%" }} />;
}
