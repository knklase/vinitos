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
  const [warningMessage, setWarningMessage] = useState("");
  const [modalWine, setModalWine] = useState(null);
  const [enlargedImage, setEnlargedImage] = useState(null);

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
            // Filtrar filas con 'Nombre' y stock mayor a 0
            setWines(
              result.data.filter(
                (wine) => wine.Nombre && parseInt(wine.Stock, 10) > 0
              )
            );
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
      // Al cambiar el tipo, se resetea la denominación (origin)
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
      setWarningMessage("Dame alguna pista para que te pueda ayudar. 😊");
      setShowWarning(true);
      return;
    }

    // Filtrar vinos disponibles (stock > 0)
    const availableWines = wines.filter(
      (wine) => parseInt(wine.Stock, 10) > 0
    );

    const scoredWines = availableWines.map((wine) => {
      let score = 0;
      const gusto = wine.Gusto ? wine.Gusto.trim().toLowerCase() : "";

      // Obtener los valores exactos de "Comida 1" y "Comida 2" dividiéndolos por comas
      const comida1 = wine["Comida 1"]
        ? wine["Comida 1"].trim().toLowerCase()
        : "";
      const comida2 = wine["Comida 2"]
        ? wine["Comida 2"].trim().toLowerCase()
        : "";
      const comida1Array = comida1
        ? comida1.split(",").map((item) => item.trim())
        : [];
      const comida2Array = comida2
        ? comida2.split(",").map((item) => item.trim())
        : [];

      const tipo = wine.Tipo ? wine.Tipo.trim().toLowerCase() : "";
      const denominacionGrupo = wine["Denominacion Grupo"]
        ? wine["Denominacion Grupo"].trim().toLowerCase()
        : "";
      const presupuesto = wine.Presupuesto
        ? wine.Presupuesto.trim().toLowerCase()
        : "";

      // Coincidencia de gusto
      if (gusto === preferences.taste.trim().toLowerCase()) score++;

      // Coincidencia en "maridaje"
      preferences.foodPairing.forEach((food) => {
        const f = food.trim().toLowerCase();
        if (comida1Array.map((s) => s.toLowerCase()).includes(f)) score++;
        if (comida2Array.map((s) => s.toLowerCase()).includes(f)) score++;
      });

      // Coincidencia de tipo (si no es "sin preferencia")
      if (
        preferences.type &&
        preferences.type.trim().toLowerCase() !== "sin preferencia" &&
        tipo === preferences.type.trim().toLowerCase()
      ) {
        score++;
      }

      // Sumar puntos por denominacion grupo (sólo para tinto, blanco y espumoso)
      if (
        preferences.origin &&
        ["tinto", "blanco", "espumoso"].includes(tipo)
      ) {
        if (
          denominacionGrupo === preferences.origin.trim().toLowerCase()
        )
          score++;
      }

      // Coincidencia de presupuesto
      if (
        preferences.budget &&
        presupuesto === preferences.budget.trim().toLowerCase()
      ) {
        score++;
      }

      // Sumar el valor de la columna "Recomendacion"
      const extra = parseInt(wine["Recomendacion"], 10);
      score += isNaN(extra) ? 0 : extra;

      console.log(`Vino: ${wine.Nombre}, Score: ${score}`);
      return { ...wine, score };
    });

    // Filtrar únicamente por tipo (si no es "sin preferencia") y presupuesto
    let filteredWines = scoredWines;
    if (
      preferences.type &&
      preferences.type.trim().toLowerCase() !== "sin preferencia"
    ) {
      filteredWines = filteredWines.filter(
        (wine) =>
          wine.Tipo &&
          wine.Tipo.trim().toLowerCase() ===
            preferences.type.trim().toLowerCase()
      );
    }
    if (preferences.budget) {
      filteredWines = filteredWines.filter(
        (wine) =>
          wine.Presupuesto &&
          wine.Presupuesto.trim().toLowerCase() ===
            preferences.budget.trim().toLowerCase()
      );
    }

    // Ordenar por puntuación de mayor a menor
    filteredWines.sort((a, b) => b.score - a.score);

    // Si no hay vinos con los filtros aplicados, mostrar ventana de advertencia
    if (filteredWines.length === 0) {
      setWarningMessage(
        "Ningún vino con los filtros aplicados, modifica el tipo y/o rango de precio. 😇"
      );
      setShowWarning(true);
      return;
    }

    setAllRecommendations(filteredWines);
    setDisplayCount(2);
  };

  // Función para mostrar todos los vinos del tipo seleccionado ordenados por precio descendente
  const showAllByType = () => {
    if (
      !preferences.type ||
      preferences.type.trim() === "" ||
      preferences.type.trim().toLowerCase() === "sin preferencia"
    ) {
      setWarningMessage("Selecciona un tipo de vino para que te pueda ayudar. 🙂");
      setShowWarning(true);
      return;
    }
    const availableWines = wines.filter(
      (wine) =>
        parseInt(wine.Stock, 10) > 0 &&
        wine.Tipo &&
        wine.Tipo.trim().toLowerCase() ===
          preferences.type.trim().toLowerCase()
    );
    availableWines.sort((a, b) => {
      const priceA = parseFloat(a.Precio) || 0;
      const priceB = parseFloat(b.Precio) || 0;
      return priceB - priceA;
    });
    setAllRecommendations(availableWines);
    setDisplayCount(availableWines.length);
  };

  const closeWarning = () => {
    setShowWarning(false);
  };

  const getWineImage = (wineType) => {
    if (!wineType) return "/images/desconocido.png";
    const lowerType = wineType.trim().toLowerCase();
    if (lowerType === "tinto") return "/images/tinto.png";
    if (lowerType === "blanco") return "/images/blanco.png";
    if (lowerType === "espumoso") return "/images/espumoso.png";
    if (lowerType === "rosado") return "/images/rosado.png";
    if (lowerType === "generoso") return "/images/generoso.png";
    if (lowerType === "dulce") return "/images/dulce.png";
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

  // Calcular el puntaje máximo para la barra de progreso
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
          <option value="cuerpo">Cuerpo</option>
          <option value="goloso">Goloso</option>
        </select>

        <label className="block mb-2 text-pink-700">Maridaje:</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {["carnes", "pescado", "arroces", "mariscos"].map((food) => (
            <label
              key={food}
              className="flex items-center space-x-2 text-pink-700"
            >
              <input
                type="checkbox"
                name="foodPairing"
                value={food}
                onChange={handleChange}
                className="text-pink-500"
              />
              <span>
                {food.charAt(0).toUpperCase() + food.slice(1)}
              </span>
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
          <option value="sin preferencia">Sin preferencia</option>
          <option value="tinto">Tinto</option>
          <option value="blanco">Blanco</option>
          <option value="espumoso">Espumoso</option>
          <option value="rosado">Rosado</option>
          <option value="generoso">Generoso</option>
          <option value="dulce">Dulce</option>
        </select>

        <label className="block mb-2 text-pink-700">
          Denominación de origen:
        </label>
        <select
          name="origin"
          onChange={handleChange}
          value={preferences.origin}
          disabled={
            !["tinto", "blanco", "espumoso"].includes(
              preferences.type.trim().toLowerCase()
            )
          }
          className="w-full p-2 mb-4 border rounded border-pink-400 text-black appearance-none"
        >
          <option value="">
            {["tinto", "blanco", "espumoso"].includes(
              preferences.type.trim().toLowerCase()
            )
              ? "Selecciona la denominación"
              : "-"}
          </option>
          {preferences.type.trim().toLowerCase() === "tinto" && (
            <>
              <option value="d.o: alicante">D.O: Alicante</option>
              <option value="d.o. ribera del duero">
                D.O. Ribera del Duero
              </option>
              <option value="d.o. rioja">D.O. Rioja</option>
              <option value="otros">Otros</option>
            </>
          )}
          {preferences.type.trim().toLowerCase() === "blanco" && (
            <>
              <option value="d.o: alicante">D.O: Alicante</option>
              <option value="d.o. rueda">D.O. Rueda</option>
              <option value="d.o. galicia">D.O. Galicia</option>
              <option value="otros">Otros</option>
            </>
          )}
          {preferences.type.trim().toLowerCase() === "espumoso" && (
            <>
              <option value="cava">Cava</option>
              <option value="champagne">Champagne</option>
              <option value="corpinnat">Corpinnat</option>
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
          className="w-full bg-pink-500 text-white p-3 rounded mt-4 hover:bg-pink-900"
        >
          MI RECOMENDACIÓN
        </button>
        {/* Botón extra para mostrar todos los vinos del tipo seleccionado */}
        <button
          onClick={showAllByType}
          className="block w-1/2 mx-auto bg-pink-500 text-white p-2 rounded mt-2 hover:bg-pink-900 text-sm"
        >
          VER TODOS
        </button>
      </div>

      {/* Modal de advertencia */}
      {showWarning && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded-lg shadow-lg text-center">
            <p className="text-pink-500 text-lg font-semibold">
              {warningMessage}
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
                  {/* Nombre con añada */}
                  <p
                    className="text-pink-800 font-semibold cursor-pointer"
                    onClick={() => openModal(wine)}
                  >
                    {wine.Nombre} {wine.Añada}
                  </p>
                </div>

                <p className="text-sm text-pink-500 italic mt-1">
                  {wine.Descripcion ? wine.Descripcion : ""}
                </p>
                {/* Línea extra: Denominación + Variedad uva */}
                <p className="text-sm text-gray-600 mt-1">
                  {wine.Denominacion} {wine["Variedad uva"]}
                </p>

                <p className="text-sm text-gray-600 mt-1">
                  Precio:{" "}
                  {wine.Precio
                    ? `${wine.Precio} €${
                        ["dulce", "generoso"].includes(
                          wine.Tipo.trim().toLowerCase()
                        )
                          ? " por copa"
                          : ""
                      }`
                    : "No especificado"}
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

      {/* Modal de ficha del vino con imagen alineada debajo de la descripción */}
      {modalWine && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded-lg shadow-lg max-w-xl w-full">
            {/* Cabecera: Nombre y Descripción centrados */}
            <h3 className="text-xl font-bold text-pink-700 mb-1 text-center">
              {modalWine.Nombre} {modalWine.Añada}
            </h3>
            <p className="text-sm text-pink-500 mb-4 text-center">
              {modalWine.Descripcion}
            </p>
            {/* Sección de imagen e información en fila */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
              {/* Imagen */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24">
                  <img
                    src={modalWine.Imagen || getWineImage(modalWine.Tipo)}
                    alt={modalWine.Nombre}
                    className="w-full h-full object-contain rounded cursor-pointer"
                    onClick={() =>
                      setEnlargedImage(
                        modalWine.Imagen || getWineImage(modalWine.Tipo)
                      )
                    }
                  />
                </div>
              </div>
              {/* Detalles */}
              <div className="flex-grow">
                <p className="text-sm mb-0">
                  <strong className="text-black font-bold">
                    Tipo:
                  </strong>{" "}
                  <span className="text-pink-500 font-normal">
                    {modalWine.Tipo} {modalWine.Barrica}
                  </span>
                </p>
                <p className="text-sm mb-0">
                  <strong className="text-black font-bold">
                    Denominación:
                  </strong>{" "}
                  <span className="text-pink-500 font-normal">
                    {modalWine.Denominacion}
                  </span>
                </p>
                <p className="text-sm mb-0">
                  <strong className="text-black font-bold">
                    Variedad:
                  </strong>{" "}
                  <span className="text-pink-500 font-normal">
                    {modalWine["Variedad uva"]}
                  </span>
                </p>
                <p className="text-sm mb-0">
                  <strong className="text-black font-bold">
                    Maceración:
                  </strong>{" "}
                  <span className="text-pink-500 font-normal">
                    {modalWine.Maceracion}
                  </span>
                </p>
                <p className="text-sm">
                  <strong className="text-black font-bold">Precio:</strong>{" "}
                  <span className="text-pink-500 font-normal">
                    {modalWine.Precio
                      ? `${modalWine.Precio} €${
                          ["dulce", "generoso"].includes(
                            modalWine.Tipo.trim().toLowerCase()
                          )
                            ? " por copa"
                            : ""
                        }`
                      : "No especificado"}
                  </span>
                </p>
              </div>
            </div>
            {/* Botones de navegación */}
            <div className="flex justify-center mt-4 space-x-4">
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
                      disabled={
                        currentIndex === allRecommendations.length - 1
                      }
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

      {/* Modal de imagen ampliada */}
      {enlargedImage && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80"
          onClick={() => setEnlargedImage(null)}
        >
          <img
            src={enlargedImage}
            alt="Imagen ampliada"
            className="max-w-full max-h-full"
          />
        </div>
      )}
    </div>
  );
}
