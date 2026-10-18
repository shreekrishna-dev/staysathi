"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function PropertiesPage() {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, []);

  async function fetchProperties() {
    const { data } = await supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false });
    setProperties(data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("properties").insert([
      { title, location, price: Number(price), phone, description },
    ]);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    setTitle("");
    setLocation("");
    setPrice("");
    setPhone("");
    setDescription("");
    fetchProperties();
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Add Property</h1>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Property title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{ width: "100%", padding: "0.5rem", marginBottom: "0.5rem" }}
        />
        <input
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          style={{ width: "100%", padding: "0.5rem", marginBottom: "0.5rem" }}
        />
        <input
          placeholder="Price"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          style={{ width: "100%", padding: "0.5rem", marginBottom: "0.5rem" }}
        />
        <input
          placeholder="Phone / WhatsApp number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          style={{ width: "100%", padding: "0.5rem", marginBottom: "0.5rem" }}
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ width: "100%", padding: "0.5rem", marginBottom: "0.5rem" }}
        />
        <button type="submit" style={{ padding: "0.5rem 1rem" }}>
          Save Property
        </button>
      </form>

      <h2 style={{ marginTop: "2rem" }}>All Properties</h2>
      {loading ? (
        <p>Loading...</p>
      ) : properties.length === 0 ? (
        <p>No properties yet.</p>
      ) : (
        <ul>
          {properties.map((p) => (
            <li key={p.id}>
              <strong>{p.title}</strong> — {p.location} — ₹{p.price} — {p.phone}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}