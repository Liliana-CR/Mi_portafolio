class PortafolioApp {
    constructor() {
        this.currentPage = 'inicio';
        this.isLoggedIn = false;
        this.semanas = JSON.parse(localStorage.getItem('semanas')) || {};
        this.unidades = [
            { id: 1, nombre: 'Unidad I', tema: 'Intrducción a la arquitectura de BASE DE DATOS' },
            { id: 2, nombre: 'Unidad II', tema: 'SQL Avanzado' },
            { id: 3, nombre: 'Unidad III', tema: 'Transacciones y Concurrencia' },
            { id: 4, nombre: 'Unidad IV', tema: 'NoSQL y Tendencias' }
        ];
        
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupLogin();
        this.setupAdminPanel();
        this.setupFileUpload();
        this.loadSemanas();
        this.updateProgress();
        this.checkAuthState();
    }

    setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo(link.dataset.page);
            });
        });
    }

    navigateTo(page) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === page) link.classList.add('active');
        });

        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

        if (page === 'inicio') {
            document.getElementById('inicio-page').classList.add('active');
            this.updateProgress();
        } else if (page === 'trabajos') {
            document.getElementById('trabajos-page').classList.add('active');
            this.renderUnidades();
        } else if (page === 'login') {
            if (this.isLoggedIn) {
                document.getElementById('admin-page').classList.add('active');
                this.renderSemanasList();
            } else {
                document.getElementById('login-page').classList.add('active');
            }
        }

        this.currentPage = page;
    }

    setupFileUpload() {
        const archivosInput = document.getElementById('archivosInput');
        const filesPreview = document.getElementById('filesPreview');
        
        if (archivosInput) {
            archivosInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                    const fileList = files.map(f => {
                        const size = (f.size / 1024).toFixed(0);
                        return `<i class="fas fa-file"></i> ${f.name} (${size} KB)`;
                    }).join('<br>');
                    filesPreview.innerHTML = `<div style="margin-top: 1rem;"><strong>${files.length} archivo(s) seleccionado(s):</strong><br>${fileList}</div>`;
                }
            });
        }
    }

    setupLogin() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;

                if (username === 'admin' && password === 'admin123') {
                    this.isLoggedIn = true;
                    localStorage.setItem('isLoggedIn', 'true');
                    this.navigateTo('login');
                    this.showNotification('¡Bienvenida Liliana! ✨', 'success');
                } else {
                    this.showNotification('Credenciales incorrectas', 'error');
                }
            });
        }

        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.isLoggedIn = false;
            localStorage.removeItem('isLoggedIn');
            this.navigateTo('inicio');
            this.showNotification('Sesión cerrada correctamente', 'info');
        });
    }

    setupAdminPanel() {
        const unidadSelect = document.getElementById('unidadSelect');
        const semanaSelect = document.getElementById('semanaSelect');

        unidadSelect?.addEventListener('change', () => {
            const unidad = unidadSelect.value;
            semanaSelect.innerHTML = '<option value="">Seleccionar semana</option>';
            
            if (unidad) {
                const inicio = (unidad - 1) * 4 + 1;
                for (let i = 0; i < 4; i++) {
                    const semanaNum = inicio + i;
                    const option = document.createElement('option');
                    option.value = semanaNum;
                    option.textContent = `Semana ${semanaNum}`;
                    semanaSelect.appendChild(option);
                }
            }
        });

        document.getElementById('uploadForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarSemana();
        });
    }

    async guardarSemana() {
        const unidad = document.getElementById('unidadSelect').value;
        const semana = document.getElementById('semanaSelect').value;
        const titulo = document.getElementById('tituloSemana').value;
        const descripcion = document.getElementById('descripcionSemana').value;
        const archivosInput = document.getElementById('archivosInput');
        const archivos = Array.from(archivosInput.files);

        if (archivos.length === 0) {
            this.showNotification('Por favor selecciona al menos un archivo', 'error');
            return;
        }

        const key = `${unidad}-${semana}`;
        
        const archivosData = await Promise.all(archivos.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    resolve({
                        nombre: file.name,
                        tipo: file.type,
                        tamaño: file.size,
                        data: e.target.result,
                        fecha: new Date().toLocaleDateString('es-ES')
                    });
                };
                reader.readAsDataURL(file);
            });
        }));

        if (this.semanas[key]) {
            this.semanas[key].archivos = [...this.semanas[key].archivos, ...archivosData];
            this.semanas[key].titulo = titulo;
            this.semanas[key].descripcion = descripcion;
        } else {
            this.semanas[key] = {
                unidad: parseInt(unidad),
                semana: parseInt(semana),
                titulo,
                descripcion,
                archivos: archivosData,
                fecha: new Date().toLocaleDateString('es-ES')
            };
        }

        localStorage.setItem('semanas', JSON.stringify(this.semanas));
        
        this.showNotification('¡Trabajo guardado exitosamente! 🎉', 'success');
        document.getElementById('uploadForm').reset();
        document.getElementById('filesPreview').innerHTML = '';
        this.renderSemanasList();
        this.renderUnidades();
        this.updateProgress();
    }

    renderUnidades() {
        const container = document.getElementById('unidadesContainer');
        if (!container) return;

        container.innerHTML = '';

        this.unidades.forEach(unidad => {
            const unidadSection = document.createElement('div');
            unidadSection.className = 'unidad-section';
            
            const semanasUnidad = [];
            for (let i = 1; i <= 4; i++) {
                const semanaNum = (unidad.id - 1) * 4 + i;
                const key = `${unidad.id}-${semanaNum}`;
                if (this.semanas[key]) {
                    semanasUnidad.push(this.semanas[key]);
                }
            }

            unidadSection.innerHTML = `
                <div class="unidad-header unidad-${unidad.id}">
                    <div>
                        <h3>${unidad.nombre}</h3>
                        <p>${unidad.tema}</p>
                    </div>
                    <span class="unidad-badge">${semanasUnidad.length} / 4 Completadas</span>
                </div>
                <div class="semanas-list">
                    ${this.renderSemanasUnidad(unidad.id)}
                </div>
            `;
            
            container.appendChild(unidadSection);
        });
    }

    renderSemanasUnidad(unidadId) {
        let html = '';
        
        for (let i = 1; i <= 4; i++) {
            const semanaNum = (unidadId - 1) * 4 + i;
            const key = `${unidadId}-${semanaNum}`;
            const semana = this.semanas[key];
            
            if (semana) {
                const totalArchivos = semana.archivos.length;
                html += `
                    <div class="semana-item">
                        <div class="semana-header">
                            <span class="semana-titulo">Semana ${semanaNum}: ${semana.titulo}</span>
                            <span class="semana-estado estado-completado">
                                <i class="fas fa-check-circle"></i> Completado
                            </span>
                        </div>
                        <p class="semana-descripcion">${semana.descripcion || 'Sin descripción'}</p>
                        <div class="archivos-container">
                            ${semana.archivos.slice(0, 3).map(archivo => `
                                <span class="archivo-tag">
                                    <i class="${this.getIconoArchivo(archivo.tipo)}"></i>
                                    ${archivo.nombre}
                                </span>
                            `).join('')}
                            ${totalArchivos > 3 ? `<span class="archivo-tag">+${totalArchivos - 3} más</span>` : ''}
                        </div>
                        <div class="semana-acciones">
                            <button class="btn-ver" onclick="app.verSemana('${key}')">
                                <i class="fas fa-eye"></i> Ver detalles
                            </button>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="semana-item">
                        <div class="semana-header">
                            <span class="semana-titulo">Semana ${semanaNum}</span>
                            <span class="semana-estado estado-pendiente">
                                <i class="fas fa-clock"></i> Pendiente
                            </span>
                        </div>
                        <p class="semana-descripcion">Trabajo no entregado</p>
                    </div>
                `;
            }
        }
        
        return html;
    }

    verSemana(key) {
        const semana = this.semanas[key];
        if (!semana) return;

        const modal = document.getElementById('modalSemana');
        document.getElementById('modalTitulo').innerHTML = `
            <i class="fas fa-folder-open"></i> 
            Unidad ${semana.unidad} - ${semana.titulo} - Semana ${semana.semana}
        `;
        
        // Mostrar la descripción completa
        document.getElementById('modalDescripcion').innerHTML = `
            <strong>Descripción del trabajo:</strong><br>
            ${semana.descripcion || 'Sin descripción'}
        `;

        const archivosList = document.getElementById('modalArchivosList');
        archivosList.innerHTML = '';
        
        semana.archivos.forEach((archivo, index) => {
            const sizeKB = (archivo.tamaño / 1024).toFixed(0);
            const item = document.createElement('div');
            item.className = 'archivo-item';
            item.innerHTML = `
                <div class="archivo-info">
                    <i class="${this.getIconoArchivo(archivo.tipo)}" style="font-size: 1.5rem;"></i>
                    <div>
                        <strong>${archivo.nombre}</strong><br>
                        <small>${sizeKB} KB • ${archivo.fecha}</small>
                    </div>
                </div>
                <div class="archivo-acciones">
                    <button class="btn-ver-archivo" onclick="app.visualizarArchivo('${key}', ${index})">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn-descargar-archivo" onclick="app.descargarArchivo('${key}', ${index})">
                        <i class="fas fa-download"></i> Descargar
                    </button>
                </div>
            `;
            archivosList.appendChild(item);
        });

        // Ocultar el visor PDF al abrir el modal
        document.getElementById('pdfViewer').style.display = 'none';
        modal.style.display = 'block';
    }

    visualizarArchivo(key, index) {
        const semana = this.semanas[key];
        const archivo = semana.archivos[index];
        
        // Mostrar el visor PDF
        const pdfViewer = document.getElementById('pdfViewer');
        const pdfFrame = document.getElementById('pdfFrame');
        
        if (archivo.tipo === 'application/pdf') {
            // Para PDFs, mostrar en el iframe
            pdfFrame.src = archivo.data;
            pdfViewer.style.display = 'block';
            
            // Scroll suave hasta el visor
            setTimeout(() => {
                pdfViewer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
            
            this.showNotification(`Visualizando: ${archivo.nombre} 📄`, 'success');
        } else if (archivo.tipo.includes('image')) {
            // Para imágenes, mostrar en el visor como HTML
            pdfFrame.src = archivo.data;
            pdfViewer.style.display = 'block';
            
            setTimeout(() => {
                pdfViewer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
            
            this.showNotification(`Visualizando: ${archivo.nombre} 🖼️`, 'success');
        } else if (archivo.tipo.includes('presentation') || archivo.tipo.includes('powerpoint')) {
            // Para PPT, abrir en Google Docs Viewer
            this.showNotification('Abriendo presentación en nueva pestaña... 📊', 'info');
            window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(archivo.data)}`, '_blank');
        } else if (archivo.tipo.includes('word') || archivo.tipo.includes('document')) {
            // Para Word, abrir en Google Docs Viewer
            this.showNotification('Abriendo documento en nueva pestaña... 📝', 'info');
            window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(archivo.data)}`, '_blank');
        } else {
            // Para otros tipos de archivo, intentar abrir en nueva pestaña
            window.open(archivo.data, '_blank');
        }
    }

    descargarArchivo(key, index) {
        const semana = this.semanas[key];
        const archivo = semana.archivos[index];
        
        const link = document.createElement('a');
        link.href = archivo.data;
        link.download = archivo.nombre;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification(`Descargando: ${archivo.nombre} 📥`, 'success');
    }

    cerrarModal() {
        document.getElementById('modalSemana').style.display = 'none';
        document.getElementById('pdfFrame').src = '';
        document.getElementById('pdfViewer').style.display = 'none';
    }

    getIconoArchivo(tipo) {
        if (tipo.includes('pdf')) return 'fas fa-file-pdf';
        if (tipo.includes('ppt') || tipo.includes('presentation')) return 'fas fa-file-powerpoint';
        if (tipo.includes('doc') || tipo.includes('word')) return 'fas fa-file-word';
        if (tipo.includes('image')) return 'fas fa-file-image';
        if (tipo.includes('zip')) return 'fas fa-file-archive';
        return 'fas fa-file';
    }

    renderSemanasList() {
        const container = document.getElementById('semanasList');
        if (!container) return;

        const semanasArray = Object.entries(this.semanas);
        if (semanasArray.length === 0) {
            container.innerHTML = '<p style="color: var(--light-text); text-align: center; padding: 2rem;">No hay semanas configuradas aún</p>';
            return;
        }

        container.innerHTML = '';
        semanasArray.sort((a, b) => {
            const [unidadA, semanaA] = a[0].split('-').map(Number);
            const [unidadB, semanaB] = b[0].split('-').map(Number);
            return unidadA - unidadB || semanaA - semanaB;
        }).forEach(([key, semana]) => {
            const item = document.createElement('div');
            item.className = 'semana-admin-item';
            item.innerHTML = `
                <div>
                    <strong>Unidad ${semana.unidad} - Semana ${semana.semana}</strong>
                    <p style="margin-top: 0.25rem;">${semana.titulo} (${semana.archivos.length} archivos)</p>
                    <small>${semana.fecha}</small>
                </div>
                <button class="btn-delete" onclick="app.eliminarSemana('${key}')">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            `;
            container.appendChild(item);
        });
    }

    eliminarSemana(key) {
        if (confirm('¿Estás segura de eliminar esta semana y todos sus archivos?')) {
            delete this.semanas[key];
            localStorage.setItem('semanas', JSON.stringify(this.semanas));
            this.renderSemanasList();
            this.renderUnidades();
            this.updateProgress();
            this.showNotification('Semana eliminada', 'info');
        }
    }

    loadSemanas() {
        this.renderUnidades();
        this.renderSemanasList();
    }

    updateProgress() {
        const totalSemanas = 16;
        const completadas = Object.keys(this.semanas).length;
        const porcentaje = (completadas / totalSemanas) * 100;
        
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const progressPercentage = document.getElementById('progressPercentage');
        
        if (progressBar) progressBar.style.width = `${porcentaje}%`;
        if (progressText) progressText.textContent = `${completadas} de ${totalSemanas} semanas completadas`;
        if (progressPercentage) progressPercentage.textContent = `${porcentaje.toFixed(0)}%`;
    }

    checkAuthState() {
        this.isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6';
        
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
            z-index: 1000;
            animation: slideIn 0.3s ease;
            font-weight: 500;
        `;
        notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i> ${message}`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
}

const app = new PortafolioApp();

window.onclick = (e) => {
    const modal = document.getElementById('modalSemana');
    if (e.target === modal) app.cerrarModal();
};