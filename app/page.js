"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";

export default function Home() {
  const [preferences, setPreferences] = useState({
    taste: "",
    foodPairing: [],
    type: "",
    budget: "",
  });
  const [wines, setWines] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    fetch(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vSEiys_b9l7KaxcC4Qz5qkBr8u4sdm5vzcMOIsBwI2SNKIcYXlDCRR9doWQYwloTEdu1dZRcVzXQCfy/pub?gid=0&single=true&output=csv"
    )
      .then((response) => response.text())
      .then((csv) => {
        Papa.parse(csv, {
          header: true,
          complete: (result) => {
            console.log("Datos obtenidos desde Google Sheets:", result.data);
            // Filtrar filas sin 'Nombre'
            setWines(result.data.filter((wine) => wine.Nombre));
          },
        });
      })
      .catch((error) => console.error("Error al cargar datos: ", error));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "foodPairing") {
      setPreferences((prev) => ({
        ...prev,
        foodPairing: prev.foodPairing.includes(value)
          ? prev.foodPairing.filter((item) => item !== value)
          : [...prev.foodPairing, value],
      }));
    } else {
      setPreferences({ ...preferences, [name]: value });
    }
    setShowWarning(false);
  };

  const getRecommendations = () => {
    if (
      !preferences.taste &&
      !preferences.foodPairing.length &&
      !preferences.type &&
      !preferences.budget
    ) {
      setShowWarning(true);
      return;
    }

    const scoredWines = wines.map((wine) => {
      let score = 0;

      const sabor = wine.Sabor ? wine.Sabor.trim().toLowerCase() : "";
      const comida = wine.Comida ? wine.Comida.trim().toLowerCase() : "";
      const tipo = wine.Tipo ? wine.Tipo.trim().toLowerCase() : "";
      const presupuesto = wine.Presupuesto
        ? wine.Presupuesto.trim().toLowerCase()
        : "";

      if (sabor === preferences.taste.trim().toLowerCase()) score++;
      if (
        preferences.foodPairing.some((food) =>
          comida.includes(food.trim().toLowerCase())
        )
      )
        score++;
      if (tipo === preferences.type.trim().toLowerCase()) score++;
      if (presupuesto === preferences.budget.trim().toLowerCase()) score++;

      console.log(`Vino: ${wine.Nombre}, Score: ${score}`);
      return { ...wine, score };
    });

    scoredWines.sort((a, b) => b.score - a.score);
    setRecommendations(scoredWines.slice(0, 2)); // top 2
  };

  const closeWarning = () => {
    setShowWarning(false);
  };

  const getWineImage = (wineType) => {
    if (!wineType) return "/images/desconocido.png";
    const lowerType = wineType.trim().toLowerCase();
    if (lowerType === "tinto") return "/images/tinto.png";
    if (lowerType === "blanco") return "/images/blanco.png";
    if (lowerType === "rosado") return "/images/rosado.png";
    if (lowerType === "espumoso") return "/images/espumoso.png";
    return "/images/desconocido.png";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-pink-100 p-4">
      <h1 className="text-3xl font-bold text-pink-700 mb-6">Mi Vinito</h1>

      {/* Formulario de preferencias */}
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md border border-pink-300">
        <label className="block mb-2 text-pink-700">Sabor Preferido:</label>
        <select
          name="taste"
          onChange={handleChange}
          className="w-full p-2 mb-4 border rounded border-pink-400"
        >
          <option value="">Selecciona...</option>
          <option value="seco">Seco</option>
          <option value="afrutado">Afrutado</option>
          <option value="fresco">Fresco</option>
        </select>

        <label className="block mb-2 text-pink-700">Para acompañar:</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {["carnes", "pescado", "ensaladas", "mariscos"].map((food) => (
            <label key={food} className="flex items-center space-x-2 text-pink-700">
              <input
                type="checkbox"
                name="foodPairing"
                value={food}
                onChange={handleChange}
                className="text-pink-500"
              />
              <span>{food.charAt(0).toUpperCase() + food.slice(1)}</span>
            </label>
          ))}
        </div>

        <label className="block mb-2 text-pink-700">Tipo de Vino:</label>
        <select
          name="type"
          onChange={handleChange}
          className="w-full p-2 mb-4 border rounded border-pink-400"
        >
          <option value="">Selecciona...</option>
          <option value="tinto">Tinto</option>
          <option value="blanco">Blanco</option>
          <option value="rosado">Rosado</option>
          <option value="espumoso">Espumoso</option>
        </select>

        <label className="block mb-2 text-pink-700">Presupuesto:</label>
        <select
          name="budget"
          onChange={handleChange}
          className="w-full p-2 mb-4 border rounded border-pink-400"
        >
          <option value="">Selecciona...</option>
          <option value="económico">Económico</option>
          <option value="medio">Medio</option>
          <option value="premium">Premium</option>
        </select>

        <button
          onClick={getRecommendations}
          className="w-full bg-pink-500 text-white p-3 rounded mt-4 hover:bg-pink-600"
        >
          Obtener Recomendaciones
        </button>
      </div>

      {/* Modal de advertencia */}
      {showWarning && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <p className="text-red-500 text-lg font-semibold">
              Dame alguna pista para que te pueda ayudar
            </p>
            <button
              onClick={closeWarning}
              className="mt-4 bg-pink-500 text-white p-2 rounded hover:bg-pink-600"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Recomendaciones */}
      {recommendations.length > 0 && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow-lg border border-pink-300 w-full max-w-md">
          <h2 className="text-xl font-semibold text-pink-700">
            Recomendaciones:
          </h2>
          <ul className="mt-2">
            {recommendations.map((wine, index) => (
              <li key={index} className="mt-4">
                <div className="flex items-center gap-3">
                  <img
                    src={getWineImage(wine.Tipo)}
                    alt={wine.Tipo}
                    className="w-8 h-8 object-cover"
                  />
                  <p className="text-pink-800 font-semibold">{wine.Nombre}</p>
                </div>

                {/* Mostrar el precio en euros */}
                <p className="text-sm text-gray-600 mt-1">
                  Precio: {wine.Precio ? `${wine.Precio} €` : "No especificado"}
                </p>

                <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                  <div
                    className="bg-pink-500 h-3 rounded-full"
                    style={{ width: `${(wine.score / 4) * 100}%` }}
                  ></div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
