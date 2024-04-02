async function loadBooksIntoList() {
    try {
            const response = await fetch('/listar-archivos-en-carpeta');
            const files = await response.json();

            const bookList = document.getElementById('bookTableBody');

            bookList.innerHTML = ''; // Limpiar lista anterior

            // Agregar nuevas filas con cada archivo y un botón
            files.forEach(file => {
                const row = document.createElement('tr');

                const fileNameCell = document.createElement('td');
                fileNameCell.textContent = file.name;
                row.appendChild(fileNameCell);

                const actionCell = document.createElement('td');
                const button = document.createElement('button');
                button.type = "submit";
                button.textContent = "Eliminar";
                button.id = "eliminar";
                button.setAttribute('data-id', file.id); // Almacenar el ID del archivo como un atributo de datos
                button.addEventListener('click', eliminarArchivo); // Agregar un event listener para eliminar el archivo
                actionCell.appendChild(button);

                const botoLlegir = document.createElement('button');
                botoLlegir.type = "submit";
                botoLlegir.textContent = "Leer";
                botoLlegir.id = "leer";
                // botoLlegir.addEventListener('click', function() {
                //     seleccionarArchivo(file);
                // });
                botoLlegir.addEventListener('click', function() {
                    fetch(`/get-file-content?id=${file.id}`)
                    .then(response => response.blob())
                    .then(blob => {
                        let formData = new FormData();
                        formData.append('file', blob, file.name);

                        fetch('/upload', {
                            method: 'POST',
                            body: formData
                        }).then(response => {
                            if (response.ok) {
                                return response.json();
                            } else {
                                throw new Error('Error al subir y descomprimir el archivo');
                            }
                        }).then(bookLinks => {
                            console.log(bookLinks);
                            filesContent = bookLinks;
                            abrirArchivo(bookLinks[0]);
                        });
                    });
                });
                actionCell.appendChild(botoLlegir);
                row.appendChild(actionCell);

                bookList.appendChild(row);
            });

        } catch (error) {
            console.error('Error cargando libros en la lista:', error);
        }
}

let currentFileIndex = 0;
let filesContent = [];
let ventanaEmergente;

function seleccionarArchivo(file) {
let formData = new FormData();
formData.append('file', file);

fetch('/upload', {
    method: 'POST',
    body: formData
}).then(response => {
    if (response.ok) {
        return response.json(); // Cambiado a json() ya que la respuesta ahora es una lista de enlaces
    } else {
        throw new Error('Error al subir y descomprimir el archivo');
    }
}).then(bookLinks => {
    // Aquí puedes manejar los enlaces del libro
    console.log(bookLinks);
    filesContent = bookLinks; // Guarda los enlaces en filesContent
abrirArchivo(bookLinks[0]); // Abre el primer enlace
});
}

async function eliminarArchivo() {
    const fileId = this.getAttribute('data-id'); // Obtener el ID del archivo desde el botón
    try {
        const response = await fetch(`/eliminar-archivo?id=${fileId}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            // Actualizar la lista de archivos después de eliminar
            loadBooksIntoList();
        } else {
            console.error('Error eliminando el archivo.');
        }
    } catch (error) {
        console.error('Error eliminando el archivo:', error);
    }
}
// Obtener referencia al menú desplegable
const fileDropdown = document.getElementById('fileDropdown');

// Función para cargar opciones en el menú desplegable
async function loadFilesIntoDropdown() {
try {
    const response = await fetch('/listar-archivos-en-carpeta');
    const files = await response.json();

    // Limpiar opciones anteriores
    fileDropdown.innerHTML = '<option value="">Select a file...</option>';

    // Agregar nuevas opciones
    files.forEach(file => {
        const option = document.createElement('option');
        option.value = file.id;
        option.textContent = file.name;
        fileDropdown.appendChild(option);
    });
} catch (error) {
    console.error('Error loading files into dropdown:', error);
}
}

// Definir una variable para almacenar el índice de la página actualmente mostrada
let currentPageIndex = 0;

// Función para avanzar a la siguiente página
function nextPage() {
if (currentPageIndex < filesContent.length - 1) {
    currentPageIndex++;
    abrirArchivo(filesContent[currentPageIndex]);
}
}

// Función para retroceder a la página anterior
function previousPage() {
if (currentPageIndex > 0) {
    currentPageIndex--;
    abrirArchivo(filesContent[currentPageIndex]);
}
}


// Llamar a la función para cargar opciones cuando se cargue la página
window.onload = loadBooksIntoList;

document.getElementById("myButton").onclick = function () {
this.style.backgroundColor = "red";
};

var fileInput = document.getElementById('fileInput');
var fileInputLabel = document.getElementById('fileInputLabel');

fileInput.addEventListener('change', function () {
if (fileInput.files && fileInput.files.length > 0) {
    let formData = new FormData();
    formData.append('file', fileInput.files[0]);

    fetch('/upload', {
        method: 'POST',
        body: formData
    });
    var fileName = '';
    if (fileInput.files.length === 1) {
        fileName = fileInput.files[0].name;
    } else {
        fileName = fileInput.files.length + ' files selected';
    }
    fileInputLabel.textContent = fileName;
} else {
    fileInputLabel.textContent = 'Select Files';
}
});


const formElem = document.querySelector('form');
formElem.addEventListener('submit', async (e) => {
console.log("form submitting")
e.preventDefault();
await fetch('/ruta', {
    method: 'POST',
    body: new FormData(formElem),
}).then(response => {
    document.querySelector('p').textContent = "Successfully uploaded to drive";

    document.getElementById("myButton").style.backgroundColor = "green"
    document.getElementById('fileInputLabel').textContent = "Select Files";
    document.querySelector('p').style.display = 'block';
    console.log(response);
    loadFilesIntoDropdown();
    loadBooksIntoList();
}).catch(error => {
    document.querySelector('p').textContent = "Was not uploaded" + error;
    document.querySelector('p').style.display = 'block';
    console.error(error);
});
});


function seleccionArchivo(){
let listadoArchivos = this.files;
let file = listadoArchivos[0];

let formData = new FormData();
formData.append('file', file);

fetch('/upload', {
    method: 'POST',
    body: formData
}).then(response => {
    if (response.ok) {
        return response.json(); // Cambiado a json() ya que la respuesta ahora es una lista de enlaces
    } else {
        throw new Error('Error al subir y descomprimir el archivo');
    }
}).then(bookLinks => {
    // Aquí puedes manejar los enlaces del libro
    console.log(bookLinks);
    filesContent = bookLinks; // Guarda los enlaces en filesContent
abrirArchivo(bookLinks[0]); // Abre el primer enlace
});
}

function asignarTeclas() {
// Asignar eventos de teclado para detectar las teclas de flecha derecha e izquierda
ventanaEmergente.addEventListener('keydown', function(event) {
    const keyCode = event.keyCode || event.which;

    // Verificar si se presionó la tecla de flecha derecha (código 39)
    if (keyCode === 39) {
        nextPage(); // Avanzar a la siguiente página
    }

    // Verificar si se presionó la tecla de flecha izquierda (código 37)
    if (keyCode === 37) {
        previousPage(); // Retroceder a la página anterior
    }
});
}


// Función para avanzar al siguiente archivo
function nextFile() {
// Verificar si hay más archivos disponibles en bookLinks
if (currentFileIndex < bookLinks.length - 1) {
    // Incrementar el índice para pasar al siguiente archivo
    currentFileIndex++;
    // Abrir el archivo correspondiente
    abrirArchivo(bookLinks[currentFileIndex]);
}
}
function abrirArchivo(link){
// Crear un iframe si no existe
if (!ventanaEmergente) {
    ventanaEmergente = window.open('', '_blank', 'width=800,height=600');
    ventanaEmergente.document.write('<iframe id="iframe" width="100%" height="100%" frameborder="0"></iframe>');
    // Asignar eventos de teclado para detectar las teclas de flecha derecha e izquierda
    asignarTeclas();
}

// Obtener el iframe del documento emergente
const iframe = ventanaEmergente.document.getElementById('iframe');
// Cargar la nueva página en el iframe
iframe.src = link;

// Al cerrar la ventana emergente, limpiar la referencia
ventanaEmergente.onbeforeunload = function() {
    ventanaEmergente = null;
};

}

window.addEventListener('load', () => {
let nombreArchivoEpub = document.getElementById('nombreArchivoEpub');
nombreArchivoEpub.addEventListener('change', seleccionArchivo);
loadFilesIntoDropdown;
loadBooksIntoList;

});

// Intento de cargar desde el drive
async function loadBooksIntoDropdown() {
try {
    const response = await fetch('/listar-libros-disponibles');
    const books = await response.json();

    const fileDropdown = document.getElementById('fileDropdown');
    fileDropdown.innerHTML = ''; // Limpiar opciones anteriores

    // Agregar nuevas opciones
    books.forEach(book => {
        const option = document.createElement('option');
        option.value = book; // Utilizar el nombre del archivo en lugar del ID
        option.textContent = book;
        fileDropdown.appendChild(option);
    });
} catch (error) {
    console.error('Error cargando libros en el menú desplegable:', error);
}
}


document.getElementById('selectButton').addEventListener('click', async () => {
const selectedFileName = document.getElementById('fileDropdown').value;
const response = await fetch(`/obtener-libro?fileName=${selectedFileName}`);
const bookContent = await response.text();

// Abrir una ventana emergente para mostrar el contenido del libro
const popupWindow = window.open('', '_blank', 'width=800,height=600');
popupWindow.document.write(bookContent);
});
    // Cargar libros disponibles cuando se carga la página
    //window.onload = loadBooksIntoDropdown;

