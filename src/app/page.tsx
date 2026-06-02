"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  MessageSquare,
  MapPin,
  Truck,
  Send,
  Star,
  Phone,
  ArrowLeft,
  ArrowRight,
  FileText,
  Lock,
  Gift,
  Compass,
  Navigation,
  ThumbsUp,
  Smile,
  Info,
  User
} from "lucide-react";

// Mock Data
interface Message {
  id: string;
  sender: "owner" | "finder";
  text: string;
  time: string;
}

interface Dropzone {
  id: string;
  name: string;
  x: number;
  y: number;
  distance: string;
  status: string;
  hours: string;
  address: string;
}

const DROPZONES: Dropzone[] = [
  {
    id: "dz-1",
    name: "Returnji CP Hub",
    x: 120,
    y: 130,
    distance: "0.8 km",
    status: "Open • Smart Lockers",
    hours: "24/7 Access",
    address: "Block A, Connaught Place (Opposite Metro Gate 3)"
  },
  {
    id: "dz-2",
    name: "Starbucks Dropzone",
    x: 340,
    y: 110,
    distance: "1.4 km",
    status: "Open • Retail Partner",
    hours: "9 AM - 11 PM",
    address: "First Floor, Sector 62 (Behind HSBC Bank)"
  },
  {
    id: "dz-3",
    name: "Blue Tokai Cafe Drop",
    x: 290,
    y: 310,
    distance: "2.1 km",
    status: "Open • Retail Partner",
    hours: "8 AM - 10 PM",
    address: "Ground Floor, Galleria Market (Next to Bookstore)"
  }
];

export default function Home() {
  const [currentView, setCurrentView] = useState<"hub" | "chat" | "dropzone" | "courier">("hub");
  
  // Chat States
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m-1",
      sender: "owner",
      text: "Hi! Thank you so much for scanning my Returnji QR tag on my luggage bag! I've been looking everywhere for it.",
      time: "08:05 AM"
    },
    {
      id: "m-2",
      sender: "owner",
      text: "Please let me know if you can drop it off at a nearby Returnji Dropzone or if you'd like me to schedule a courier to pick it up directly from you. I will cover all the delivery expenses and have included a reward!",
      time: "08:06 AM"
    }
  ]);

  // Dropzone States
  const [selectedDropzone, setSelectedDropzone] = useState<Dropzone>(DROPZONES[0]);
  const [isNavigating, setIsNavigating] = useState(false);

  // Courier/Uber Pickup States
  const [courierState, setCourierState] = useState<"idle" | "searching" | "matched" | "transit" | "arrived">("idle");
  const [courierProgress, setCourierProgress] = useState(0); // 0 to 100
  const [eta, setEta] = useState(3); // minutes
  const [driftTime, setDriftTime] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll chat to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, currentView]);

  // Simulate floating/drifting couriers when idle on Courier screen
  useEffect(() => {
    const timer = setInterval(() => {
      setDriftTime((t) => (t + 1) % 360);
    }, 150);
    return () => clearInterval(timer);
  }, []);

  // Live courier transit animation logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (courierState === "transit") {
      interval = setInterval(() => {
        setCourierProgress((prev) => {
          const next = prev + 1.25; // Speed multiplier
          if (next >= 100) {
            clearInterval(interval);
            setCourierState("arrived");
            setEta(0);
            return 100;
          }
          const newEta = Math.max(1, Math.ceil(3 * (1 - next / 100)));
          setEta(newEta);
          return next;
        });
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [courierState]);

  // Handle finder sending a message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: `m-finder-${Date.now()}`,
      sender: "finder",
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    const sentText = inputText.trim().toLowerCase();
    setInputText("");

    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      let replyText = "Thank you so much! You are a lifesaver. Let me know which option (Dropzone or Courier) works best for you so we can coordinate.";
      
      if (sentText.includes("courier") || sentText.includes("pickup") || sentText.includes("collect") || sentText.includes("uber")) {
        replyText = "Oh that's perfect! Yes, please go back to the hub and select 'Courier Pickup' to request a Returnji courier. The platform will assign a rider to pick it up and secure it, and notify me in real-time. Thank you!";
      } else if (sentText.includes("drop") || sentText.includes("dropzone") || sentText.includes("hub") || sentText.includes("locker")) {
        replyText = "Awesome! Dropping it at a Returnji Hub is super convenient. You can lock it in a smart locker. Go back to the hub and open 'Submit to Dropzone' to see which location is closest to you and get navigation directions. Let me know once you lock it!";
      } else if (sentText.includes("reward") || sentText.includes("money") || sentText.includes("cash")) {
        replyText = "Yes! I've pre-funded a reward on the Returnji platform. It will be released to your account automatically once the courier scans the QR code or you drop it off at a locker. You deserve it!";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `m-owner-reply-${Date.now()}`,
          sender: "owner",
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 2500);
  };

  // Launch Courier Matching process
  const handleRequestCourier = () => {
    setCourierState("searching");
    setCourierProgress(0);
    setEta(3);

    setTimeout(() => {
      setCourierState("matched");
      
      setTimeout(() => {
        setCourierState("transit");
      }, 2500);
    }, 3500);
  };

  // Map Coordinates
  const finderPos = { x: 220, y: 220 };
  const courierStartPos = { x: 40, y: 60 };

  const getCourierCoordinates = () => {
    if (courierState !== "transit" && courierState !== "arrived") {
      return courierStartPos;
    }
    const p = courierProgress;
    if (p < 50) {
      const ratio = p / 50;
      return {
        x: courierStartPos.x,
        y: courierStartPos.y + ratio * (finderPos.y - courierStartPos.y)
      };
    } else {
      const ratio = (p - 50) / 50;
      return {
        x: courierStartPos.x + ratio * (finderPos.x - courierStartPos.x),
        y: finderPos.y
      };
    }
  };

  const courierPos = getCourierCoordinates();

  const idleCourier1 = {
    x: 100 + Math.sin(driftTime * (Math.PI / 180)) * 12,
    y: 300 + Math.cos(driftTime * (Math.PI / 180)) * 8
  };
  const idleCourier2 = {
    x: 360 + Math.cos(driftTime * (Math.PI / 180) + 1) * 10,
    y: 180 + Math.sin(driftTime * (Math.PI / 180) + 1) * 12
  };

  return (
    <div className="app-shell">
      {/* 1. MAIN HUB SCREEN */}
      {currentView === "hub" && (
        <div className="tab-panel" style={{ backgroundColor: "var(--bg-shell)" }}>
          {/* Mockup Top Rounded Card */}
          <div className="hub-header-card">
            <div className="hub-avatar-wrapper">
              <User size={38} strokeWidth={1.5} />
            </div>
            <h1 className="hub-item-name">Luggage bag</h1>
            <div className="hub-subtitle">
              <span>You found someone's lost item</span>
              <span>👋</span>
            </div>
          </div>

          {/* Mockup scrollable body content */}
          <div className="hub-body">
            {/* Description card */}
            <div className="desc-card">
              <div className="desc-icon-wrapper">
                <FileText size={20} />
              </div>
              <div className="desc-content">
                <span className="desc-label">Description</span>
                <span className="desc-text">Black travel luggage bag with leather handles</span>
              </div>
            </div>

            {/* Reward Card */}
            <div className="reward-card">
              <div className="reward-info">
                <span className="reward-label">Reward Offered</span>
                <span className="reward-value">₹500</span>
              </div>
              <div className="reward-pouch-wrapper">
                💰
              </div>
            </div>

            {/* Slogan Prompt */}
            <p className="prompt-slogan">
              Help return it and claim your reward safely without sharing personal details.
            </p>

            {/* Lavender action buttons */}
            <div className="action-buttons-group">
              <button
                className="lavender-btn"
                onClick={() => setCurrentView("chat")}
              >
                <MessageSquare size={18} />
                <span>Start Anonymous Chat</span>
              </button>

              <button
                className="lavender-btn"
                onClick={() => setCurrentView("dropzone")}
              >
                <MapPin size={18} />
                <span>Submit to Dropzone</span>
              </button>

              <button
                className="lavender-btn"
                onClick={() => setCurrentView("courier")}
              >
                <Truck size={18} />
                <span>Request Courier Pickup</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CHAT OVERLAY VIEW */}
      {currentView === "chat" && (
        <div className="sub-screen-overlay">
          <header className="sub-screen-header">
            <button className="back-btn" onClick={() => setCurrentView("hub")}>
              <ArrowLeft size={20} />
            </button>
            <span className="sub-screen-title">Anonymous Chat</span>
          </header>

          <div className="light-chat-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`light-bubble-wrapper ${
                  msg.sender === "owner" ? "owner" : "finder"
                }`}
              >
                <span className="light-bubble-sender">
                  {msg.sender === "owner" ? "Owner" : "You (Finder)"}
                </span>
                <div className="light-bubble">{msg.text}</div>
                <span className="light-chat-time">{msg.time}</span>
              </div>
            ))}

            {isTyping && (
              <div className="light-typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="light-chat-footer">
            <div className="light-input-container">
              <input
                type="text"
                placeholder="Type your message securely..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="light-chat-input"
              />
            </div>
            <button
              type="submit"
              className="light-send-btn"
              disabled={!inputText.trim()}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* 3. DROPZONE OVERLAY VIEW */}
      {currentView === "dropzone" && (
        <div className="sub-screen-overlay">
          <header className="sub-screen-header">
            <button className="back-btn" onClick={() => setCurrentView("hub")}>
              <ArrowLeft size={20} />
            </button>
            <span className="sub-screen-title">Nearest Dropzones</span>
          </header>

          <div className="light-map-container">
            {/* SVG Dark-Theme Stylized Map */}
            <svg className="light-map-canvas" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="light-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#121217" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="#070709" />
              <rect width="100%" height="100%" fill="url(#light-grid)" />

              {/* Streets */}
              <path d="M 40 0 L 40 400" stroke="#16161D" strokeWidth="16" fill="none" opacity="0.9" />
              <path d="M 220 0 L 220 400" stroke="#16161D" strokeWidth="18" fill="none" opacity="0.9" />
              <path d="M 340 0 L 340 400" stroke="#16161D" strokeWidth="14" fill="none" opacity="0.9" />
              <path d="M 0 130 L 400 130" stroke="#16161D" strokeWidth="18" fill="none" opacity="0.9" />
              <path d="M 0 220 L 400 220" stroke="#16161D" strokeWidth="22" fill="none" opacity="0.9" />
              <path d="M 0 310 L 400 310" stroke="#16161D" strokeWidth="14" fill="none" opacity="0.9" />

              {/* Street Names */}
              <text x="50" y="214" fill="#475569" fontSize="8" fontWeight="600" opacity="0.8">INNER RING RD</text>
              <text x="226" y="80" fill="#475569" fontSize="8" fontWeight="600" opacity="0.8" transform="rotate(90, 226, 80)">CONNAUGHT ST</text>

              {/* Neon Navigation Path */}
              {isNavigating && selectedDropzone && (
                <path
                  d={`M ${finderPos.x} ${finderPos.y} 
                      L ${finderPos.x} ${selectedDropzone.y} 
                      L ${selectedDropzone.x} ${selectedDropzone.y}`}
                  stroke="#FFFFFF"
                  strokeWidth="4.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="8 6"
                  className="animate-route"
                />
              )}

              {/* Finder Indicator (You) */}
              <circle cx={finderPos.x} cy={finderPos.y} r="18" fill="#FFFFFF" opacity="0.15" />
              <circle cx={finderPos.x} cy={finderPos.y} r="8" fill="#FFFFFF" stroke="#000000" strokeWidth="1.5" />
              <circle cx={finderPos.x} cy={finderPos.y} r="3" fill="#000000" />

              {/* Dropzone Markers */}
              {DROPZONES.map((dz) => {
                const isSelected = dz.id === selectedDropzone.id;
                return (
                  <g
                    key={dz.id}
                    cursor="pointer"
                    onClick={() => {
                      setSelectedDropzone(dz);
                      setIsNavigating(false);
                    }}
                  >
                    {isSelected && (
                      <circle cx={dz.x} cy={dz.y} r="18" fill="#FFFFFF" opacity="0.18" className="animate-ping" style={{ animationDuration: '2s' }} />
                    )}
                    <circle
                      cx={dz.x}
                      cy={dz.y}
                      r={isSelected ? "11" : "8"}
                      fill={isSelected ? "#FFFFFF" : "#1C1C24"}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                    <circle
                      cx={dz.x}
                      cy={dz.y}
                      r="3.5"
                      fill={isSelected ? "#000000" : "#FFFFFF"}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Instruction Box Overlay */}
            <div className="light-overlay-card">
              <Compass size={18} className="text-secondary" style={{ color: "#FFFFFF" }} />
              <div>
                <div className="light-overlay-title">Dropzone Return Locker</div>
                <div className="light-overlay-desc">Drop your found luggage bag off at these safe physical lockboxes.</div>
              </div>
            </div>

            {/* Dropzone lists */}
            <div className="light-dropzone-sheet">
              {DROPZONES.map((dz) => {
                const isSelected = dz.id === selectedDropzone.id;
                return (
                  <div
                    key={dz.id}
                    className={`light-dropzone-card ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedDropzone(dz);
                      setIsNavigating(false);
                    }}
                  >
                    <div className="dropzone-info">
                      <span className="dropzone-title" style={{ fontSize: "13.5px", fontWeight: "700" }}>{dz.name}</span>
                      <span className="dropzone-desc" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{dz.address}</span>
                      <div>
                        <span className="light-dropzone-badge">{dz.hours}</span>
                      </div>
                    </div>
                    <div className="dropzone-action">
                      <span className="light-dropzone-distance">{dz.distance}</span>
                      <button
                        className="light-nav-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDropzone(dz);
                          setIsNavigating(true);
                        }}
                      >
                        <Navigation size={10} fill={isSelected && isNavigating ? "#000000" : "none"} />
                        <span>{isSelected && isNavigating ? "Navigating" : "Directions"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. COURIER OVERLAY VIEW */}
      {currentView === "courier" && (
        <div className="sub-screen-overlay">
          <header className="sub-screen-header">
            <button className="back-btn" onClick={() => setCurrentView("hub")}>
              <ArrowLeft size={20} />
            </button>
            <span className="sub-screen-title">Courier Handover</span>
          </header>

          <div className="light-map-container">
            {/* SVG Dark Courier Grid Map */}
            <svg className="light-map-canvas" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="#070709" />
              <rect width="100%" height="100%" fill="url(#light-grid)" />

              {/* Streets */}
              <path d="M 40 0 L 40 400" stroke="#16161D" strokeWidth="16" fill="none" opacity="0.9" />
              <path d="M 220 0 L 220 400" stroke="#16161D" strokeWidth="18" fill="none" opacity="0.9" />
              <path d="M 0 130 L 400 130" stroke="#16161D" strokeWidth="18" fill="none" opacity="0.9" />
              <path d="M 0 220 L 400 220" stroke="#16161D" strokeWidth="22" fill="none" opacity="0.9" />

              {/* Active Route */}
              {(courierState === "transit" || courierState === "arrived") && (
                <path
                  d={`M ${courierStartPos.x} ${courierStartPos.y} L ${courierStartPos.x} ${finderPos.y} L ${finderPos.x} ${finderPos.y}`}
                  stroke="#FFFFFF"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.3"
                />
              )}

              {courierState === "transit" && (
                <path
                  d={`M ${courierStartPos.x} ${courierStartPos.y} L ${courierStartPos.x} ${finderPos.y} L ${finderPos.x} ${finderPos.y}`}
                  stroke="#FFFFFF"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="6 6"
                  className="animate-route"
                />
              )}

              {/* Finder dot (You) */}
              <circle cx={finderPos.x} cy={finderPos.y} r="18" fill="#FFFFFF" opacity="0.15" />
              <circle cx={finderPos.x} cy={finderPos.y} r="8" fill="#FFFFFF" stroke="#000000" strokeWidth="1.5" />
              <circle cx={finderPos.x} cy={finderPos.y} r="3" fill="#000000" />

              {/* Idle visual drift couriers */}
              {courierState === "idle" && (
                <>
                  <g>
                    <circle cx={idleCourier1.x} cy={idleCourier1.y} r="10" fill="#FFFFFF" opacity="0.15" />
                    <circle cx={idleCourier1.x} cy={idleCourier1.y} r="5" fill="#FFFFFF" stroke="#000" strokeWidth="1.5" />
                  </g>
                  <g>
                    <circle cx={idleCourier2.x} cy={idleCourier2.y} r="10" fill="#FFFFFF" opacity="0.15" />
                    <circle cx={idleCourier2.x} cy={idleCourier2.y} r="5" fill="#FFFFFF" stroke="#000" strokeWidth="1.5" />
                  </g>
                </>
              )}

              {/* Transit/matched Courier Icon */}
              {(courierState === "transit" || courierState === "matched" || courierState === "arrived") && (
                <g style={{ transition: "all 0.1s linear" }}>
                  <circle
                    cx={courierPos.x}
                    cy={courierPos.y}
                    r="16"
                    fill="#FFFFFF"
                    opacity="0.2"
                    className={courierState === "matched" ? "animate-ping" : ""}
                  />
                  <circle
                    cx={courierPos.x}
                    cy={courierPos.y}
                    r="9"
                    fill="#FFFFFF"
                    stroke="#000000"
                    strokeWidth="2"
                  />
                  <circle cx={courierPos.x} cy={courierPos.y} r="2.5" fill="#000000" />
                </g>
              )}
            </svg>

            {/* Map Header Status Overlay */}
            <div className="light-overlay-card">
              <div className="light-pulse-dot"></div>
              <div>
                <div className="light-overlay-title">
                  {courierState === "idle" && "Request Returnji Courier Delivery"}
                  {courierState === "searching" && "Matching Nearest Delivery Guy..."}
                  {courierState === "matched" && "Courier Partner Confirmed"}
                  {courierState === "transit" && `Courier En-Route • ${eta}m away`}
                  {courierState === "arrived" && "Courier Has Arrived!"}
                </div>
                <div className="light-overlay-desc">
                  {courierState === "idle" && "Rider picks up the luggage bag and returns it securely to Atharva."}
                  {courierState === "searching" && "Querying logistics network database..."}
                  {courierState === "matched" && "Amit Kumar is preparing to pick up the item."}
                  {courierState === "transit" && "Rider is heading to your coordinates on the map."}
                  {courierState === "arrived" && "Hand over the item and provide the security code."}
                </div>
              </div>
            </div>

            {/* Courier Bottom drawer sheets */}
            <div className="light-uber-drawer">
              {/* IDLE PANEL */}
              {courierState === "idle" && (
                <div>
                  <div className="light-drawer-header">
                    <div>
                      <h3 className="light-drawer-title">Returnji Courier Handover</h3>
                      <span className="light-dropzone-badge" style={{ marginTop: "2px" }}>Automated Delivery Support</span>
                    </div>
                    <span className="light-dropzone-distance" style={{ fontSize: "13px" }}>2 mins away</span>
                  </div>

                  <div className="desc-card" style={{ cursor: "default", marginBottom: "14px", padding: "12px" }}>
                    <div className="desc-content">
                      <span className="desc-label" style={{ fontSize: "11px", color: "#FFFFFF", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Gift size={12} />
                        Zero-Cost Secure Handover
                      </span>
                      <p style={{ marginTop: "4px", fontSize: "11px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                        Rider checks the Returnji barcode on the item, validates the secure transaction PIN, and instantly unlocks your reward. Pre-funded by Atharva.
                      </p>
                    </div>
                  </div>

                  <button className="lavender-btn" style={{ width: "100%", padding: "14px" }} onClick={handleRequestCourier}>
                    <span>Request Courier Handover</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              )}

              {/* SEARCHING RADAR PANEL */}
              {courierState === "searching" && (
                <div className="light-radar-wrapper">
                  <div className="light-radar-circle">
                    <div className="light-radar-inner">
                      <Truck size={20} className="animate-bounce" />
                    </div>
                  </div>
                  <div className="light-drawer-title" style={{ textAlign: "center" }}>
                    Finding Nearby Returnji Courier...
                  </div>
                  <span className="light-overlay-desc">Connecting with available riders in Connaught Place</span>
                </div>
              )}

              {/* MATCHED PANEL */}
              {courierState === "matched" && (
                <div className="light-courier-card">
                  <div className="light-drawer-header" style={{ marginBottom: "4px" }}>
                    <h3 className="light-drawer-title" style={{ color: "#FFFFFF" }}>Courier Matched!</h3>
                    <span className="light-dropzone-badge">Ready to pick up</span>
                  </div>

                  <div className="light-courier-row">
                    <div className="light-courier-profile">
                      <div className="light-courier-avatar">
                        <Smile size={22} className="text-secondary" style={{ color: "#FFFFFF" }} />
                        <div className="light-courier-status"></div>
                      </div>
                      <div>
                        <span className="light-courier-name">Amit Kumar</span>
                        <div className="light-overlay-desc" style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                          <Star size={10} fill="#FFFFFF" stroke="none" />
                          <strong>4.9</strong> (420 trips)
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span className="light-courier-plate">DL 3C AB 9081</span>
                      <div className="light-overlay-desc">Electric Scooter</div>
                    </div>
                  </div>
                  
                  <div className="light-eta-box" style={{ background: "rgba(255, 255, 255, 0.05)", borderColor: "rgba(255, 255, 255, 0.15)" }}>
                    <span className="light-eta-title" style={{ color: "#FFFFFF" }}>Arriving in 3 minutes</span>
                    <span className="light-eta-sub">Amit is starting his journey</span>
                  </div>
                </div>
              )}

              {/* TRANSIT TRACKING PANEL */}
              {courierState === "transit" && (
                <div className="light-courier-card">
                  <div className="light-courier-row">
                    <div className="light-courier-profile">
                      <div className="light-courier-avatar">
                        <Smile size={22} className="text-secondary" style={{ color: "#FFFFFF" }} />
                        <div className="light-courier-status"></div>
                      </div>
                      <div>
                        <span className="light-courier-name">Amit Kumar</span>
                        <div className="light-overlay-desc" style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                          <Star size={10} fill="#FFFFFF" stroke="none" />
                          <strong>4.9</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span className="light-courier-plate">DL 3C AB 9081</span>
                      <div className="light-overlay-desc">Electric Scooter</div>
                    </div>
                  </div>

                  <div className="light-eta-box">
                    <div>
                      <span className="light-eta-title">Arriving in {eta} min{eta > 1 ? "s" : ""}</span>
                      <div className="light-eta-sub">Amit is riding towards your location</div>
                    </div>
                    <div className="light-dropzone-distance" style={{ fontSize: "16px", color: "#FFFFFF" }}>
                      {Math.max(100, Math.ceil(900 * (1 - courierProgress / 100)))}m
                    </div>
                  </div>

                  {/* Simulating active call/text */}
                  <div style={{ display: "flex", gap: "10px" }}>
                    <a href="tel:+919999999999" style={{ flex: 1, textDecoration: "none" }}>
                      <button className="light-nav-btn" style={{ width: "100%", justifyContent: "center", padding: "10px", marginTop: "0" }}>
                        <Phone size={13} />
                        <span>Call Rider</span>
                      </button>
                    </a>
                    <button
                      className="light-nav-btn"
                      style={{ flex: 1, justifyContent: "center", padding: "10px", marginTop: "0" }}
                      onClick={() => {
                        setCurrentView("chat");
                        setMessages((prev) => [
                          ...prev,
                          {
                            id: `m-courier-chat-${Date.now()}`,
                            sender: "owner",
                            text: "[SYSTEM]: Courier partner Amit Kumar is now connected to this secure chat thread.",
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          }
                        ]);
                      }}
                    >
                      <MessageSquare size={13} />
                      <span>Chat Thread</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ARRIVED HANDOVER OTP PANEL */}
              {courierState === "arrived" && (
                <div className="light-courier-card" style={{ alignItems: "center" }}>
                  <div className="light-drawer-header" style={{ width: "100%", marginBottom: "4px" }}>
                    <h3 className="light-drawer-title" style={{ color: "#FFFFFF", display: "flex", alignItems: "center", gap: "4px" }}>
                      <ThumbsUp size={16} />
                      Courier Arrived!
                    </h3>
                    <span className="light-courier-plate">DL 3C AB 9081</span>
                  </div>

                  <div className="light-otp-box">3824</div>

                  <p className="light-otp-desc">
                    Share this 4-digit handover OTP with the rider **Amit Kumar** once you hand over the **Luggage bag**. He will scan the tag and release your reward!
                  </p>

                  <button
                    className="lavender-btn"
                    onClick={() => {
                      setCourierState("idle");
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: `m-handover-done-${Date.now()}`,
                          sender: "owner",
                          text: "🎉 [SYSTEM SUCCESS]: Luggage bag has been successfully handed over to Courier Partner Amit Kumar. Your Finder's Reward of ₹500 has been released. Thank you for your honesty!",
                          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        }
                      ]);
                      setCurrentView("chat");
                    }}
                    style={{ backgroundColor: "#FFFFFF", color: "#000000", width: "100%", padding: "14px" }}
                  >
                    <span>Simulate Handover Completion</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Styled Route SVG Dash Motion animation injected directly */}
      <style jsx global>{`
        @keyframes route-move {
          to {
            stroke-dashoffset: -100;
          }
        }
        .animate-route {
          animation: route-move 6s linear infinite;
        }
      `}</style>
    </div>
  );
}
