"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";
import { FiInfo } from "react-icons/fi";

export default function Home() {
  // ESTADOS
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

  // Modales adicionales
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [showGustosModal, setShowGustosModal] = useState(false);

  // CARGA DE DATOS DESDE GOOGLE SHEETS
  useEffect(() => {
    fetch(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vSEiys_b9l7KaxcC4Qz5qkBr8u4sdm5vzcMOIsBwI2SNKIcYXlDCRR9doWQYwloTEdu1dZRcVzXQCfy/pub?gid=0&single=true&output=csv"
    )
      .then((response) => response.text())
      .then((csv) => {
        Papa.parse(csv, {
          header: true,
          complete: (result) => {
            // Filtrar solo filas con 'Nombre' y stock > 0
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

  // FUNCIONES AUXILIARES
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "foodPairing") {
      // Manejo de checks de maridaje
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

  // Función para obtener imagen según el tipo de vino
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

  // Función para mostrar el precio (por copa solo en generoso)
  const renderPrecio = (precio, tipo) => {
    if (!precio) return "No especificado";
    return `${precio}${
      tipo.trim().toLowerCase() === "generoso" ? " por copa" : ""
    }`;
  };

  // Función principal para recomendaciones
  const getRecommendations = () => {
    // Verificar que el usuario no deje todo en blanco
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

    // Filtrar vinos disponibles
    const availableWines = wines.filter(
      (wine) => parseInt(wine.Stock, 10) > 0
    );

    // Calcular la puntuación (score)
    const scoredWines = availableWines.map((wine) => {
      let score = 0;
      const gusto = wine.Gusto ? wine.Gusto.trim().toLowerCase() : "";

      // Comidas (maridajes) separadas por comas
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

      // Coincidencia en maridaje (Comida 1 y Comida 2)
      preferences.foodPairing.forEach((food) => {
        const f = food.trim().toLowerCase();
        if (comida1Array.map((s) => s.toLowerCase()).includes(f)) score++;
        if (comida2Array.map((s) => s.toLowerCase()).includes(f)) score++;
      });

      // Coincidencia de tipo (si no es sin preferencia)
      if (
        preferences.type &&
        preferences.type.trim().toLowerCase() !== "sin preferencia" &&
        tipo === preferences.type.trim().toLowerCase()
      ) {
        score++;
      }

      // Coincidencia de origen (denominación) para tinto, blanco y espumoso
      if (
        preferences.origin &&
        ["tinto", "blanco", "espumoso"].includes(tipo) &&
        denominacionGrupo === preferences.origin.trim().toLowerCase()
      ) {
        score++;
      }

      // Coincidencia de presupuesto
      if (
        preferences.budget &&
        presupuesto === preferences.budget.trim().toLowerCase()
      ) {
        score++;
      }

      // Sumar valor de columna 'Recomendacion'
      const extra = parseInt(wine["Recomendacion"], 10);
      score += isNaN(extra) ? 0 : extra;

      return { ...wine, score };
    });

    // Mostrar por consola los vinos con su score
    scoredWines.forEach((wine) => {
    console.log(`• ${wine.Nombre}: ${wine.score} puntos`);
    });

    // Filtrar por tipo (si no es sin preferencia) y presupuesto
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

    // Ordenar de mayor a menor puntuación
    filteredWines.sort((a, b) => b.score - a.score);

    // Si no hay vinos tras filtrar
    if (filteredWines.length === 0) {
      setWarningMessage(
        "Ningún vino con los filtros aplicados, modifica el tipo y/o rango de precio. 😇"
      );
      setShowWarning(true);
      return;
    }

    // Guardamos todas las recomendaciones y reseteamos la cuenta a 2
    setAllRecommendations(filteredWines);
    setDisplayCount(2);
  };

  // Función para mostrar todos los vinos del tipo
  const showAllByType = () => {
    if (
      !preferences.type ||
      preferences.type.trim() === "" ||
      preferences.type.trim().toLowerCase() === "sin preferencia"
    ) {
      setWarningMessage(
        "Selecciona un tipo de vino para que te pueda ayudar. 🙂"
      );
      setShowWarning(true);
      return;
    }
    // Filtrar y ordenar por precio descendente
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

  // Cerrar ventana de advertencia
  const closeWarning = () => {
    setShowWarning(false);
  };

  // Mostrar más vinos (aumentar displayCount)
  const showMore = () => {
    setDisplayCount((prev) => prev + 3);
  };

  // Abrir y cerrar modal de ficha de vino
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

  // Para la barra de progreso (score)
  const maxScore =
    allRecommendations.length > 0
      ? Math.max(...allRecommendations.map((wine) => wine.score))
      : 0;

  // RENDER
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-orange-500 p-2">
      {/* Logo con onClick para mostrar el modal de la dueña */}
      <img
        src="/images/logo.png"
        alt="Logo de la bodega"
        className="h-40 w-auto pb-2 cursor-pointer"
        onClick={() => setShowOwnerModal(true)}
      />

      {/* FORMULARIO DE PREFERENCIAS */}
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md border border-orange-300">
        {/* Gusto (con icono de información) */}
        <div className="flex items-center mb-2">
          <span className="font-bold text-orange-700">Gusto:</span>
          <FiInfo
            className="ml-2 text-blue-500 cursor-pointer"
            size={18}
            onClick={() => setShowGustosModal(true)}
          />
        </div>
        <select
          name="taste"
          onChange={handleChange}
          className="w-full p-2 mb-4 border rounded border-orange-400 text-black appearance-none"
        >
          <option value="">¿Cómo te gustan los vinos?</option>
          <option value="goloso">Goloso</option>
          <option value="fresco">Fresco</option>
          <option value="afrutado">Afrutado</option>
          <option value="seco">Seco</option>
          <option value="cuerpo">Cuerpo</option>
          <option value="dulce">Dulce</option>
          <option value="balsámico">Balsámico</option>
          <option value="floral">Floral</option>
          <option value="especiado">Especiado</option>
        </select>

        {/* Maridaje (8 opciones en 2 filas de 4) */}
        <label className="block font-bold mb-2 text-orange-700">Maridaje:</label>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            "entrantes",
            "carnes",
            "mariscos",
            "postres",
            "arroces",
            "pescados",
            "quesos",
            "all in",
          ].map((food) => (
            <label
              key={food}
              className="flex items-center space-x-2 text-orange-700"
            >
              <input
                type="checkbox"
                name="foodPairing"
                value={food}
                onChange={handleChange}
                className="text-orange-500"
              />
              <span>
                {food.charAt(0).toUpperCase() + food.slice(1)}
              </span>
            </label>
          ))}
        </div>

        {/* Tipo */}
        <label className="block font-bold mb-2 text-orange-700">Tipo:</label>
        <select
          name="type"
          onChange={handleChange}
          className="w-full p-2 mb-4 border rounded border-orange-400 text-black appearance-none"
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

        {/* Denominación de origen */}
        <label className="block font-bold mb-2 text-orange-700">
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
          className="w-full p-2 mb-4 border rounded border-orange-400 text-black appearance-none"
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
              <option value="d.o. alicante">D.O. Alicante</option>
              <option value="d.o. ribera del duero">D.O. Ribera del Duero</option>
              <option value="d.o.ca rioja">D.O.Ca. Rioja</option>
              <option value="internacional">INTERNACIONAL</option>
              <option value="otros">Otros</option>
            </>
          )}
          {preferences.type.trim().toLowerCase() === "blanco" && (
            <>
              <option value="d.o. alicante">D.O. Alicante</option>
              <option value="d.o. rueda">D.O. Rueda</option>
              <option value="galicia">Galicia</option>
              <option value="internacional">INTERNACIONAL</option>
              <option value="otros">Otros</option>
            </>
          )}
          {preferences.type.trim().toLowerCase() === "espumoso" && (
            <>
              <option value="d.o. cava">D.O. Cava</option>
              <option value="a.o.c. champagne">A.O.C. Champagne</option>
              <option value="corpinnat">CORPINNAT</option>
            </>
          )}
        </select>

        {/* Precio */}
        <label className="block font-bold mb-2 text-orange-700">Precio:</label>
        <select
          name="budget"
          onChange={handleChange}
          className="w-full p-2 mb-4 border rounded border-orange-400 text-black appearance-none"
        >
          <option value="">¿Qué rango de precios?</option>
          <option value="económico">Económico</option>
          <option value="medio">Medio</option>
          <option value="premium">Premium</option>
        </select>

        {/* BOTONES */}
        <button
          onClick={getRecommendations}
          className="w-full bg-orange-500 text-white p-3 rounded mt-4 hover:bg-orange-900"
        >
          MI RECOMENDACIÓN
        </button>
        <button
          onClick={showAllByType}
          className="block w-1/2 mx-auto bg-orange-500 text-white p-2 rounded mt-2 hover:bg-orange-900 text-sm"
        >
          VER TODOS
        </button>
      </div>

      {/* MODAL DE ADVERTENCIA */}
      {showWarning && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded-lg shadow-lg text-center">
            <p className="text-orange-500 text-lg font-semibold">
              {warningMessage}
            </p>
            <button
              onClick={closeWarning}
              className="mt-4 bg-orange-500 text-white p-2 rounded hover:bg-orange-600"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* LISTA DE RECOMENDACIONES */}
      {allRecommendations.length > 0 && (
        <div className="mt-6 bg-white p-4 rounded-lg shadow-lg border border-orange-300 w-full max-w-md">
          <ul className="mt-2">
            {allRecommendations.slice(0, displayCount).map((wine, index) => (
              <li key={index} className="mt-4">
                <div className="flex items-center gap-3">
                  <img
                    src={getWineImage(wine.Tipo)}
                    alt={wine.Tipo}
                    className="w-8 h-8 object-cover"
                  />
                  <p
                    className="text-orange-800 font-semibold cursor-pointer"
                    onClick={() => openModal(wine)}
                  >
                    {wine.Nombre} {wine.Añada}
                  </p>
                </div>
                <p className="text-sm text-orange-500 italic mt-1">
                  {wine.Descripcion ? wine.Descripcion : ""}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {wine.Denominacion} {wine["Variedad uva"]}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Precio: {renderPrecio(wine.Precio, wine.Tipo)}
                </p>

                {/* Barra de progreso según score */}
                <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                  <div
                    className="bg-orange-500 h-3 rounded-full"
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
                className="w-1/2 bg-orange-500 text-white p-3 rounded hover:bg-orange-600"
              >
                MUÉSTRAME MÁS
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE FICHA DE VINO */}
      {modalWine && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded-lg shadow-lg max-w-xl w-full">
            <h3 className="text-xl font-bold text-orange-700 mb-1 text-center">
              {modalWine.Nombre} {modalWine.Añada}
            </h3>
            <p className="text-sm text-orange-500 mb-4 text-center">
              {modalWine.Descripcion}
            </p>
            <div className="flex flex-col md:flex-row gap-4 items-center">
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
              <div className="flex-grow">
                <p className="text-sm mb-0">
                  <strong className="text-black font-bold">Tipo:</strong>{" "}
                  <span className="text-orange-500 font-normal">
                    {modalWine.Tipo} {modalWine.Barrica}
                  </span>
                </p>
                <p className="text-sm mb-0">
                  <strong className="text-black font-bold">
                    Denominación:
                  </strong>{" "}
                  <span className="text-orange-500 font-normal">
                    {modalWine.Denominacion}
                  </span>
                </p>
                <p className="text-sm mb-0">
                  <strong className="text-black font-bold">Variedad:</strong>{" "}
                  <span className="text-orange-500 font-normal">
                    {modalWine["Variedad uva"]}
                  </span>
                </p>
                <p className="text-sm mb-0">
                  <strong className="text-black font-bold">Gusto:</strong>{" "}
                  <span className="text-orange-500 font-normal">
                    {modalWine.Gusto}
                  </span>
                </p>
                {/* Nuevo campo Maridajes */}
                {(() => {
                  // Aquí definimos la variable "maridajes"
                  const maridajes = [modalWine["Comida 1"], modalWine["Comida 2"]]
                    .filter(Boolean) // Elimina valores falsy (como undefined o "")
                    .join(" y ");
                  return (
                    <p className="text-sm mb-0">
                      <strong className="text-black font-bold">Maridajes:</strong>{" "}
                      <span className="text-orange-500 font-normal">{maridajes}</span>
                    </p>
                  );
                })()}
                {/*
                <p className="text-sm mb-0">
                  <strong className="text-black font-bold">
                    Maceración:
                  </strong>{" "}
                  <span className="text-orange-500 font-normal">
                    {modalWine.Maceracion}
                  </span>
                </p>
                */}
                <p className="text-sm">
                  <strong className="text-black font-bold">Precio:</strong>{" "}
                  <span className="text-orange-500 font-normal">
                    {renderPrecio(modalWine.Precio, modalWine.Tipo)}
                  </span>
                </p>
              </div>
            </div>
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
                      className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ←
                    </button>
                    <button
                      onClick={closeModal}
                      className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
                    >
                      Cerrar
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={
                        currentIndex === allRecommendations.length - 1
                      }
                      className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* MODAL DE IMAGEN AMPLIADA */}
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

      {/* MODAL DE LA DUEÑA DE LA BODEGA */}
      {showOwnerModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded-lg shadow-lg text-center max-w-lg">
            <h3 className="text-xl font-bold text-orange-700">
              Ángela Rodríguez Ruiz
            </h3>
            <h3 className="text-sm italic text-orange-700 mb-3">
              11 de Enero de 1990, Alicante
            </h3>
            <img
              src="/images/Angela.png"
              alt="Dueña de la bodega"
              className="w-32 h-32 rounded-full mx-auto mb-4"
            />
            <p
              className="text-sm text-gray-700 mb-4"
              style={{ textAlign: "justify" }}
            >
              Ángela empezó su trayectoria profesional en el 2012 como bartender.
              El duende del vino la incitó a este maravilloso e infinito mundo en
              el 2016, con otra gran noticia.
            </p>
            <p
              className="text-sm text-gray-700 mb-2"
              style={{ textAlign: "justify" }}
            >
              - 2018 se gradúa como Sumiller internacional por la ESHOB.
            </p>
            <p
              className="text-sm text-gray-700 mb-2"
              style={{ textAlign: "justify" }}
            >
              - 2019 gana su primer campeonato como mejor sumiller de Alicante y
              única mujer por el momento, título que se mantiene hasta hoy.
            </p>
            <p
              className="text-sm text-gray-700 mb-2"
              style={{ textAlign: "justify" }}
            >
              2019 formadora de vinos y vinagres de Montilla Moriles.
            </p>
            <p
              className="text-sm text-gray-700 mb-2"
              style={{ textAlign: "justify" }}
            >
              - 2021 y 2022 segundo puesto como mejor sumiller de la Comunidad
              Valenciana.
            </p>
            <p
              className="text-sm text-gray-700 mb-2"
              style={{ textAlign: "justify" }}
            >
              - 2022 WSET 2 y WSET 3 en la escuela de catas.
            </p>
            <p
              className="text-sm text-gray-700 mb-2"
              style={{ textAlign: "justify" }}
            >
              - 2023 formador homologado vinos Alicante.
            </p>
            <p
              className="text-sm text-gray-700 mb-4"
              style={{ textAlign: "justify" }}
            >
              - 2024 formador homologado DOP vinos Naranja del Condado de Huelva.
            </p>
            <p
              className="text-sm text-gray-700 mb-4"
              style={{ textAlign: "justify" }}
            >
              En 2024 abre su propio salón de casa para todos ustedes, con un top
              100 de mejor sumiller de España bajo el brazo, acercando de forma
              canalla el fabuloso mundo vitivinícola con profesionalidad, cariño
              y sentimiento.
            </p>
            <p className="text-sm text-gray-700 mb-2">"Poco vino me parece"</p>
            <button
              onClick={() => setShowOwnerModal(false)}
              className="mt-4 bg-orange-500 text-white p-2 rounded hover:bg-orange-600"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE EXPLICACIÓN DE GUSTOS */}
      {showGustosModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded-lg shadow-lg text-center max-w-md">
            <h3 className="text-xl font-bold text-orange-700 mb-4">
              Explicación de los Gustos
            </h3>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Goloso:</strong> Vino agradable y atractivo al paladar.
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Fresco:</strong> Vino que destaca por su acidez y vivacidad.
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Afrutado:</strong> Vino con notas intensas de frutas.
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Seco:</strong> Vino con poca o ninguna sensación de dulzor.
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Cuerpo:</strong> Vino con estructura y peso en boca.
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Dulce:</strong> Vino con un toque de dulzor, residuo de
              azúcar.
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Balsámico:</strong> Vino con aromas que recuerdan a hierbas
              aromáticas o resinas.
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Floral:</strong> Vino que exhibe aromas y matices que
              evocan flores.
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Especiado:</strong> Vino con notas de especias como
              pimienta, clavo o canela.
            </p>
            <button
              onClick={() => setShowGustosModal(false)}
              className="mt-4 bg-orange-500 text-white p-2 rounded hover:bg-orange-600"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
