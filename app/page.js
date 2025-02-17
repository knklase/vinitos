"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";

export default function Home() {
  const [preferences, setPreferences] = useState({
    taste: "",
    foodPairing: [],
    type: "",
    origin: "",
    budget: "",
  });
  const [wines, setWines] = useState([]);
  const [allRecommendations, setAllRecommendations] = useState([]);
  const [displayCount, setDisplayCount] = useState(2);
  const [showWarning, setShowWarning] = useState(false);
  const [modalWine, setModalWine] = useState(null);

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
    } else if (name === "type") {
      setPreferences((prev) => ({
        ...prev,
        type: value,
        origin: "",
      }));
    } else {
      setPreferences((prev) => ({ ...prev, [name]: value }));
    }
    setShowWarning(false);
  };

  const getRecommendations = () => {
    if (
      !preferences.taste &&
      !preferences.foodPairing.length &&
      !preferences.type &&
      !preferences.budget &&
      !preferences.origin
    ) {
      setShowWarning(true);
      return;
    }

    const scoredWines = wines.map((wine) => {
      let score = 0;

      const gusto = wine.Gusto ? wine.Gusto.trim().toLowerCase() : "";
      const comida1 = wine["Comida 1"]
        ? wine["Comida 1"].trim().toLowerCase()
        : "";
      const comida2 = wine["Comida 2"]
        ? wine["Comida 2"].trim().toLowerCase()
        : "";
      const tipo = wine.Tipo ? wine.Tipo.trim().toLowerCase() : "";
      const denominacion = wine["Denominación"]
        ? wine["Denominación"].trim().toLowerCase()
        : "";
      const presupuesto = wine.Presupuesto
        ? wine.Presupuesto.trim().toLowerCase()
        : "";

      // Comparar gusto
      if (gusto === preferences.taste.trim().toLowerCase()) score++;

      // Comparar "para acompañar" (suma en ambas columnas)
      preferences.foodPairing.forEach((food) => {
        const f = food.trim().toLowerCase();
        if (comida1.includes(f)) score++;
        if (comida2.includes(f)) score++;
      });

      // Comparar tipo (solo si no es "Sin preferencia")
      if (
        preferences.type &&
        preferences.type.trim().toLowerCase() !== "sin preferencia" &&
        tipo === preferences.type.trim().toLowerCase()
      ) {
        score++;
      }

      // Comparar denominación de origen
      if (
        preferences.origin &&
        denominacion === preferences.origin.trim().toLowerCase()
      ) {
        score++;
      }

      // Comparar presupuesto
      if (presupuesto === preferences.budget.trim().toLowerCase()) score++;

      // Sumar el extra de la columna "Recomendación"
      const extra = parseInt(wine["Recomendación"], 10);
      score += isNaN(extra) ? 0 : extra;

      console.log(`Vino: ${wine.Nombre}, Score: ${score}`);
      return { ...wine, score };
    });

    // Filtrar por tipo si se ha seleccionado uno específico (que no sea "Sin preferencia")
    let filteredWines = scoredWines;
    if (
      preferences.type &&
      preferences.type.trim().toLowerCase() !== "sin preferencia"
    ) {
      filteredWines = scoredWines.filter(
        (wine) =>
          wine.Tipo &&
          wine.Tipo.trim().toLowerCase() ===
            preferences.type.trim().toLowerCase()
      );
    }

    // Ordenar vinos de mayor a menor puntuación
    filteredWines.sort((a, b) => b.score - a.score);
    setAllRecommendations(filteredWines);
    setDisplayCount(2);
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

  const showMore = () => {
    setDisplayCount((prev) => prev + 3);
  };

  // Funciones para el modal de la ficha del vino
  const openModal = (wine) => {
    setModalWine(wine);
  };

  const closeModal = () => {
    setModalWine(null);
  };

  const handlePrevious = () => {
    if (!modalWine) return;
    const index = allRecommendations.findIndex(
      (wine) => wine.Nombre === modalWine.Nombre
    );
    if (index > 0) {
      setModalWine(allRecommendations[index - 1]);
    }
  };

  const handleNext = () => {
    if (!modalWine) return;
    const index = allRecommendations.findIndex(
      (wine) => wine.Nombre === modalWine.Nombre
    );
    if (index < allRecommendations.length - 1) {
      setModalWine(allRecommendations[index + 1]);
    }
  };

  // Calcular el puntaje máximo entre todas las recomendaciones para normalizar la barra
  const maxScore =
    allRecommendations.length > 0
      ? Math.max(...allRecommendations.map((wine) => wine.score))
      : 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-pink-100 p-2">
      <h1 className="text-3xl font-bold text-pink-700 mb-1">Airen</h1>
      <h2 className="text-1xl text-pink-700 mb-4">
        La bodega de Ángela Rodríguez
      </h2>
      <img
        src="/images/logo.png"
        alt="Logo de la bodega"
        className="h-20 w-auto pb-4"
      />

      {/* Formulario de preferencias */}
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md border border-pink-300">
        <label className="block mb-2 text-pink-700">Gusto:</label>
        <select
          name="taste"
          onChange={handleChange}
          className="w-full p-2 mb-4 border rounded border-pink-400 text-black appearance-none"
        >
          <option value="">¿Cómo te gustan los vinos?</option>
          <option value="seco">Seco</option>
          <option value="afrutado">Afrutado</option>
          <option value="fresco">Fresco</option>
          <option value="dulce">Dulce</option>
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

        <label className="block mb-2 text-pink-700">Tipo:</label>
        <select
          name="type"
          onChange={handleChange}
          className="w-full p-2 mb-4 border rounded border-pink-400 text-black appearance-none"
        >
          <option value="">¿Qué tipo prefieres?</option>
          <option value="Sin preferencia">Sin preferencia</option>
          <option value="tinto">Tinto</option>
          <option value="blanco">Blanco</option>
          <option value="rosado">Rosado</option>
          <option value="espumoso">Espumoso</option>
        </select>

        <label className="block mb-2 text-pink-700">
          Denominación de origen:
        </label>
        <select
          name="origin"
          onChange={handleChange}
          value={preferences.origin}
          disabled={
            !["tinto", "blanco", "espumoso", "rosado"].includes(
              preferences.type
            )
          }
          className="w-full p-2 mb-4 border rounded border-pink-400 text-black appearance-none"
        >
          <option value="">Selecciona antes el tipo.</option>
          {preferences.type === "tinto" && (
            <>
              <option value="alicante">Alicante</option>
              <option value="ribera">Ribera</option>
              <option value="rioja">Rioja</option>
              <option value="internacional">Internacional</option>
            </>
          )}
          {preferences.type === "blanco" && (
            <>
              <option value="alicante">Alicante</option>
              <option value="rueda">Rueda</option>
              <option value="albariño">Albariño</option>
              <option value="internacional">Internacional</option>
            </>
          )}
          {preferences.type === "espumoso" && (
            <>
              <option value="cava">Cava</option>
              <option value="champange">Champange</option>
            </>
          )}
          {preferences.type === "rosado" && (
            <>
              <option value="grenache">Grenache</option>
              <option value="syrah">Syrah</option>
            </>
          )}
        </select>

        <label className="block mb-2 text-pink-700">Precio:</label>
        <select
          name="budget"
          onChange={handleChange}
          className="w-full p-2 mb-4 border rounded border-pink-400 text-black appearance-none"
        >
          <option value="">¿Qué rango de precios?</option>
          <option value="económico">Económico</option>
          <option value="medio">Medio</option>
          <option value="premium">Premium</option>
        </select>

        <button
          onClick={getRecommendations}
          className="w-full bg-pink-500 text-white p-3 rounded mt-4 hover:bg-pink-600"
        >
          MI RECOMENDACIÓN
        </button>
      </div>

      {/* Modal de advertencia */}
      {showWarning && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded-lg shadow-lg text-center">
            <p className="text-pink-500 text-lg font-semibold">
              Dame alguna pista para que te pueda ayudar
            </p>
            <button
              onClick={closeWarning}
              className="mt-4 bg-pink-500 text-white p-2 rounded hover:bg-pink-600"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Recomendaciones */}
      {allRecommendations.length > 0 && (
        <div className="mt-6 bg-white p-4 rounded-lg shadow-lg border border-pink-300 w-full max-w-md">
          <ul className="mt-2">
            {allRecommendations.slice(0, displayCount).map((wine, index) => (
              <li key={index} className="mt-4">
                <div className="flex items-center gap-3">
                  <img
                    src={getWineImage(wine.Tipo)}
                    alt={wine.Tipo}
                    className="w-8 h-8 object-cover"
                  />
                  {/* Nombre clickable para abrir el modal */}
                  <p
                    className="text-pink-800 font-semibold cursor-pointer underline"
                    onClick={() => openModal(wine)}
                  >
                    {wine.Nombre}
                  </p>
                </div>

                <p className="text-sm text-pink-500 italic mt-1">
                  {wine.Descripcion ? wine.Descripcion : ""}
                </p>

                <p className="text-sm text-gray-600 mt-1">
                  Precio: {wine.Precio ? `${wine.Precio} €` : "No especificado"}
                </p>

                <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                  <div
                    className="bg-pink-500 h-3 rounded-full"
                    style={{
                      width: `${
                        maxScore > 0
                          ? Math.min((wine.score / maxScore) * 100, 100)
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </li>
            ))}
          </ul>
          {displayCount < allRecommendations.length && (
            <div className="flex justify-center mt-4">
              <button
                onClick={showMore}
                className="w-1/2 bg-pink-500 text-white p-3 rounded hover:bg-pink-600"
              >
                MUÉSTRAME MÁS
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal de ficha del vino */}
      {modalWine && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          {/* Contenedor del modal */}
          <div className="bg-white p-2 rounded-lg shadow-lg max-w-xl w-full">
            {/* TÍTULO centrado */}
            <h3 className="text-xl font-bold text-pink-700 mb-1 text-center">
              {modalWine.Nombre}
            </h3>
            {/* Fila para imagen + info */}
            <div className="flex flex-col md:flex-row gap-1">
              {/* Columna 1: Imagen */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 mt-2">
                  <img
                    src={modalWine.Imagen || getWineImage(modalWine.Tipo)}
                    alt={modalWine.Nombre}
                    className="w-full h-full object-contain rounded"
                  />
                </div>
              </div>
              {/* Columna 2: Información */}
              <div>
                <p className="text-sm mb-0">
                  <strong className="text-black font-bold">Marida con:</strong>{" "}
                  <span className="text-pink-500 font-normal">
                    {[modalWine["Comida 1"], modalWine["Comida 2"]]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </p>
                <p className="text-sm mb-0">
                  <strong className="text-black font-bold">Tipo:</strong>{" "}
                  <span className="text-pink-500 font-normal">
                    {modalWine.Tipo}
                  </span>
                </p>
                <p className="text-sm mb-0">
                  <strong className="text-black font-bold">
                    Denominación de origen:
                  </strong>{" "}
                  <span className="text-pink-500 font-normal">
                    {modalWine["Denominación"]}
                  </span>
                </p>
                <p className="text-sm mb-0">
                  <strong className="text-black font-bold">
                    Descripción:
                  </strong>{" "}
                  <span className="text-pink-500 font-normal">
                    {modalWine.Descripcion}
                  </span>
                </p>
                <p className="text-sm">
                  <strong className="text-black font-bold">Precio:</strong>{" "}
                  <span className="text-pink-500 font-normal">
                    {modalWine.Precio ? `${modalWine.Precio} €` : "No especificado"}
                  </span>
                </p>
              </div>
            </div>
            {/* Botones centrados */}
            <div className="flex justify-center mt-3 space-x-4">
              {(() => {
                const currentIndex = allRecommendations.findIndex(
                  (wine) => wine.Nombre === modalWine.Nombre
                );
                return (
                  <>
                    <button
                      onClick={handlePrevious}
                      disabled={currentIndex === 0}
                      className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ←
                    </button>
                    <button
                      onClick={closeModal}
                      className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600"
                    >
                      Cerrar
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={currentIndex === allRecommendations.length - 1}
                      className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      →
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
