import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Default Karnataka Capgemini campuses
const DEFAULT_OFFICES = [
  {
    name: "Capgemini DTP Campus",
    city: "Bengaluru",
    state: "Karnataka",
    address: "Divyasree Technopark, EPIP Zone, Whitefield",
    latitude: 12.9847,
    longitude: 77.7289,
    distance_km: 0.04
  },
  {
    name: "Capgemini EPIP Campus",
    city: "Bengaluru",
    state: "Karnataka",
    address: "155, EPIP Phase II, Whitefield",
    latitude: 12.9780,
    longitude: 77.7260,
    distance_km: 0.81
  },
  {
    name: "Capgemini RMZ Ecoworld",
    city: "Bengaluru",
    state: "Karnataka",
    address: "Plot No. 1, Campus 6B, Outer Ring Road",
    latitude: 12.9230,
    longitude: 77.6830,
    distance_km: 6.49
  },
  {
    name: "Capgemini Pritech Park",
    city: "Bengaluru",
    state: "Karnataka",
    address: "Block 7A, Pritech Park SEZ, Bellandur",
    latitude: 12.9260,
    longitude: 77.6870,
    distance_km: 6.63
  }
];
import { Title } from "../common/Title";
import Shuttle from "./shuttle";

export function Workplace() {
  const [offices, setOffices] = useState(DEFAULT_OFFICES);
  const [officeState, setOfficeState] = useState("Karnataka");
  const [officeStatus, setOfficeStatus] = useState("Showing nearest campuses in Karnataka.");
  const [selectedOffice, setSelectedOffice] = useState(DEFAULT_OFFICES[0]);
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const userMarkerRef = useRef(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [12.9847, 77.7289],
        zoom: 14,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: "topright" }).addTo(map);

      L.control.attribution({ position: "bottomright", prefix: false })
        .addAttribution('© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>')
        .addTo(map);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;
      mapInstanceRef.current = map;

      setTimeout(() => { map.invalidateSize(); }, 250);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    const officeList = offices && offices.length > 0 ? offices : DEFAULT_OFFICES;

    officeList.forEach(office => {
      if (office.latitude == null || office.longitude == null) return;
      const isSelected = selectedOffice?.name === office.name;
      const shortName = office.name.replace("Capgemini ", "");

      const markerHtml = `
        <div class="wlPinWrap ${isSelected ? "wlPinActive" : ""}">
          <div class="wlPinBody">
            <span class="wlPinDot"></span>
            <span class="wlPinLabel">${shortName}</span>
            ${office.distance_km != null ? `<span class="wlPinKm">${Number(office.distance_km).toFixed(1)} km</span>` : ""}
          </div>
          <div class="wlPinTail"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "wlDivIcon",
        html: markerHtml,
        iconSize: [148, 46],
        iconAnchor: [74, 44]
      });

      const marker = L.marker([office.latitude, office.longitude], {
        icon: customIcon,
        zIndexOffset: isSelected ? 1000 : 100
      });

      marker.on("click", () => {
        setSelectedOffice(office);
        map.flyTo([office.latitude, office.longitude], 15, { duration: 0.8 });
      });

      marker.addTo(markersGroup);
    });

    // User location pin
    if (userLocation?.latitude && userLocation?.longitude) {
      if (userMarkerRef.current) userMarkerRef.current.remove();
      const userHtml = `<div class="wlUserPin"><span class="wlUserRing"></span><span class="wlUserCore"></span></div>`;
      const userIcon = L.divIcon({
        className: "wlUserDivIcon",
        html: userHtml,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });
      userMarkerRef.current = L.marker([userLocation.latitude, userLocation.longitude], {
        icon: userIcon,
        zIndexOffset: 2000
      }).bindTooltip("Your Location", { permanent: false, direction: "top" }).addTo(map);
    }
  }, [offices, selectedOffice, userLocation]);

  function focusOffice(office) {
    setSelectedOffice(office);
    if (mapInstanceRef.current && office.latitude && office.longitude) {
      mapInstanceRef.current.flyTo([office.latitude, office.longitude], 16, { duration: 0.85 });
    }
  }

  function findOffices() {
    if (!navigator.geolocation) {
      setOfficeStatus("Browser location is not available.");
      return;
    }
    setIsLocating(true);
    setOfficeStatus("Detecting your location…");

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setUserLocation({ latitude: coords.latitude, longitude: coords.longitude });
        try {
          const api = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), 30000);
          const response = await fetch(`${api}/api/offices/nearby`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: "nearest Capgemini office",
              latitude: coords.latitude,
              longitude: coords.longitude,
              limit: 6
            }),
            signal: controller.signal
          });
          window.clearTimeout(timeout);
          const data = await response.json();
          if (!response.ok) throw new Error(data.detail || "Office lookup failed.");

          const fetchedOffices = data.offices || [];
          if (fetchedOffices.length > 0) {
            setOffices(fetchedOffices);
            setSelectedOffice(fetchedOffices[0]);
            if (mapInstanceRef.current) {
              mapInstanceRef.current.flyTo(
                [fetchedOffices[0].latitude, fetchedOffices[0].longitude],
                15, { duration: 1.2 }
              );
            }
          }
          setOfficeState(data.user_state || "Karnataka");
          setOfficeStatus(
            data.fallback_all_states
              ? "No office found in your state — showing nearest campuses."
              : `Showing nearest campuses in ${data.user_state || "your state"}.`
          );
        } catch (error) {
          setOfficeStatus(
            error.name === "AbortError"
              ? "Request timed out. Check your connection."
              : error.message || "Office lookup failed."
          );
        } finally {
          setIsLocating(false);
        }
      },
      error => {
        setIsLocating(false);
        const message = {
          1: "Location access denied. Enable location in your browser to find nearest campuses.",
          2: "Could not determine device location. Showing default campuses.",
          3: "Location request timed out. Showing default campuses."
        }[error.code] || "Unable to fetch your location.";
        setOfficeStatus(message);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  }

  const activeCampus = selectedOffice || DEFAULT_OFFICES[0];
  const dtpCampus = offices?.find(o => o.name.toLowerCase().includes("dtp")) || DEFAULT_OFFICES[0];

  const dtpMapUrl = `https://www.openstreetmap.org/?mlat=${dtpCampus.latitude}&mlon=${dtpCampus.longitude}#map=16/${dtpCampus.latitude}/${dtpCampus.longitude}`;

  const activeDirectionsUrl = userLocation
    ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${activeCampus.latitude},${activeCampus.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${activeCampus.name}, ${activeCampus.city}`)}`;

  return (
    <div className="wlRoot">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="wlHeader">
        <div className="wlHeaderTop">
          <div className="wlHeaderMeta">
            <span className="wlEyebrow">
              <span className="wlEyebrowDot" />
              Capgemini Digital Workplace
            </span>
            <h1 className="wlTitle">Office Locator</h1>
            <p className="wlSubtitle">Discover nearby Capgemini campuses and office locations.</p>
          </div>
          <div className="wlHeaderChips">
            <span className="wlChip wlChipAccent">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              {officeState ? `${officeState} Region` : "Karnataka Region"}
            </span>
            <span className="wlChip">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>
              {offices ? `${offices.length} Campuses` : "4 Campuses"}
            </span>
          </div>
        </div>
      </header>

      {/* ── PRIMARY CAMPUS CARD ─────────────────────────────── */}
      <div className="wlPrimaryCard">
        <div className="wlPrimaryAccent" />
        <div className="wlPrimaryInner">
          <div className="wlPrimaryLeft">
            <div className="wlPrimaryIcon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div className="wlPrimaryInfo">
              <span className="wlPrimaryLabel">⭐ Your Primary Campus</span>
              <strong className="wlPrimaryName">{dtpCampus.name}</strong>
              <span className="wlPrimaryAddr">
                {dtpCampus.address ? `${dtpCampus.address}, ` : ""}
                {dtpCampus.city}, {dtpCampus.state}
              </span>
            </div>
          </div>
          <div className="wlPrimaryActions">
            <a href={dtpMapUrl} target="_blank" rel="noreferrer" className="wlBtnPrimary">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              Open Campus
            </a>
            <a href={activeDirectionsUrl} target="_blank" rel="noreferrer" className="wlBtnSecondary">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="9 18 15 12 9 6"/></svg>
              Get Directions
            </a>
          </div>
        </div>
      </div>

      {/* ── MAIN LAYOUT ─────────────────────────────────────── */}
      <div className="wlLayout">

        {/* LEFT: Map Column */}
        <section className="wlMapCol">

          {/* Map Container */}
          <div className="wlMapCard">
            {/* Floating status bar */}
            <div className="wlMapBar">
              <span className="wlMapStatus">
                <span className="wlLiveDot" />
                {activeCampus.name}
              </span>
              <div className="wlMapNav">
                {offices?.slice(0, 3).map(o => (
                  <button
                    key={o.name}
                    className={`wlMapNavBtn ${activeCampus.name === o.name ? "wlMapNavActive" : ""}`}
                    onClick={() => focusOffice(o)}
                    title={`View ${o.name}`}
                  >
                    {o.name.replace("Capgemini ", "")}
                  </button>
                ))}
              </div>
            </div>
            <div ref={mapContainerRef} className="wlMapEl" />
          </div>

        </section>

        {/* RIGHT: Office Panel */}
        <aside className="wlPanel">
          <div className="wlPanelCard">
            <div className="wlPanelHead">
              <div className="wlPanelTitle">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0096da" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
                </svg>
                Nearby Campuses
              </div>
              <button
                onClick={findOffices}
                disabled={isLocating}
                className="wlLocateBtn"
                title="Detect your location to find nearest offices"
              >
                {isLocating ? (
                  <span className="wlLocateSpin" />
                ) : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                )}
                {isLocating ? "Locating…" : "Find Nearby"}
              </button>
            </div>

            {officeStatus && (
              <p className="wlStatusMsg">{officeStatus}</p>
            )}

            <div className="wlOfficeList">
              {offices?.map(office => {
                const isActive = activeCampus.name === office.name;
                return (
                  <article
                    key={`${office.name}-${office.city}`}
                    className={`wlOfficeItem ${isActive ? "wlOfficeActive" : ""}`}
                    onClick={() => focusOffice(office)}
                    title="Click to view on map"
                  >
                    <div className="wlOfficeIconBox">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                    </div>
                    <div className="wlOfficeDetails">
                      <div className="wlOfficeTitleRow">
                        <span className="wlOfficeName">{office.name}</span>
                        {office.distance_km != null && (
                          <span className="wlOfficeKm">{Number(office.distance_km).toFixed(2)} km</span>
                        )}
                      </div>
                      <span className="wlOfficeCity">
                        {office.address ? `${office.address}, ` : ""}
                        {office.city}, {office.state}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* DTP Quick-Access Banner */}
          <div className="wlDtpCard">
            <div className="wlDtpCardLeft">
              <span className="wlDtpIcon">🏢</span>
              <div>
                <strong className="wlDtpName">DTP Campus</strong>
                <small className="wlDtpMeta">Flagship · Whitefield</small>
              </div>
            </div>
            <a href={dtpMapUrl} target="_blank" rel="noreferrer" className="wlDtpBtn">
              Open ↗
            </a>
          </div>
        </aside>
      </div>
      <div className="campusMobilityBelowMap">
        <Shuttle compact={false} />
      </div>
    </div>
  );
}

export default Workplace;
