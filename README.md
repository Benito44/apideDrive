npm install multer
npm install googleapis
npm install adm-zip

## PROGRESO
Mario, 21/03/2024 --> Hasta ahora, podemos subir archivos, descomprimirlos y coger el contenido de la carpeta de contenido y crear los links para ver los capítulos.
Se envian bien los links, y se crea la ventana nueva (no como emergente, eso hay que arreglarlo), pero no se ve el contenido, falta de solucionar este problema.

## Solucion a mostrar el contenido
Benito, 22/03/2024 --> He podido solucionar el mostrar el contenido canviando el puerto que llamabas en la linia 85
por el 8080 (antes estaba en el 3000 y parece que ahora se muestra la portada del libro)