// ========== CONFIGURACIÓN DE GITHUB ==========
const GITHUB_CONFIG = {
    // ¡PEGA TU TOKEN AQUÍ!
    token: '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',
    owner: 'Liliana-CR',
    repo: 'Mi_portafolio',
    branch: 'main'
};

// ========== APLICACIÓN PRINCIPAL ==========
class PortafolioApp {
    constructor() {
        this.currentPage = 'inicio';
        this.isLoggedIn = false;
        this.semanas = {};
        this.unidades = [
            { id: 1, nombre: 'Unidad I', tema: 'Intrducción a la arquitectura de BASE DE DATOS' },
            { id: 2, nombre: 'Unidad II', tema: 'SQL Avanzado' },
            { id: 3, nombre: 'Unidad III', tema: 'Transacciones y Concurrencia' },
            { id: 4, nombre: 'Unidad IV', tema: 'NoSQL y Tendencias' }
        ];
        
        // Variables para PDF.js
        this.pdfDoc = null;
        this.currentPageNum = 1;
        this.totalPages = 1;
        this.currentZoom = 1.5;
        
        this.init();
    }

    async init() {
        await this.loadSemanasFromGitHub();
        this.setupNavigation();
        this.setupLogin();
        this.setupAdminPanel();
        this.setupFileUpload();
        this.renderUnidades();
        this.updateProgress();
        this.checkAuthState();
        
        // Configurar PDF.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }

    async loadSemanasFromGitHub() {
        try {
            const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/semanas.json`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${GITHUB_CONFIG.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const content = atob(data.content);
                this.semanas = JSON.parse(content);
                this.showNotification('✅ Datos cargados desde GitHub', 'success');
            } else {
                console.log('No se encontró semans.json');
                this.semanas = {};
            }
        } catch (e) {
            console.error('Error cargando:', e);
            this.semanas = {};
        }
    }

    async saveSemanasToGitHub() {
        try {
            const content = btoa(unescape(encodeURIComponent(JSON.stringify(this.semanas, null, 2))));
            
            const checkUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/semanas.json`;
            
            let sha = null;
            try {
                const checkResponse = await fetch(checkUrl, {
                    headers: {
                        'Authorization': `token ${GITHUB_CONFIG.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                if (checkResponse.ok) {
                    const data = await checkResponse.json();
                    sha = data.sha;
                }
            } catch (e) {}
            
            const body = {
                message: 'Actualizando semanas académicas',
                content: content,
                branch: GITHUB_CONFIG.branch
            };
            
            if (sha) body.sha = sha;
            
            const response = await fetch(checkUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_CONFIG.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            
            if (response.ok) {
                return true;
            } else {
                const error = await response.json();
                console.error('Error:', error);
                throw new Error(error.message);
            }
        } catch (e) {
            console.error('Error guardando:', e);
            throw e;
        }
    }

    async uploadFileToGitHub(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const base64Content = e.target.result.split(',')[1];
                    const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                    const path = `archivos/${Date.now()}_${fileName}`;
                    const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`;
                    
                    const body = {
                        message: `Subiendo archivo: ${file.name}`,
                        content: base64Content,
                        branch: GITHUB_CONFIG.branch
                    };
                    
                    const response = await fetch(url, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `token ${GITHUB_CONFIG.token}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(body)
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        const rawUrl = `https://raw.githubusercontent.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${path}`;
                        resolve({
                            nombre: file.name,
                            url: rawUrl,
                            tipo: file.type,
                            tamaño: file.size
                        });
                    } else {
                        const error = await response.json();
                        reject(new Error(error.message));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Error leyendo archivo'));
            reader.readAsDataURL(file);
        });
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
                    let totalSize = 0;
                    const fileList = files.map(f => {
                        totalSize += f.size;
                        const size = (f.size / 1024).toFixed(0);
                        return `<i class="fas fa-file"></i> ${f.name} (${size} KB)`;
                    }).join('<br>');
                    
                    const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
                    
                    filesPreview.innerHTML = `
                        <div style="margin-top: 1rem;">
                            <strong>${files.length} archivo(s) seleccionado(s):</strong><br>
                            ${fileList}<br>
                            <small style="color: #10B981;">
                                Tamaño total: ${totalMB} MB
                            </small>
                        </div>
                    `;
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
            this.showNotification('Sesión cerrada', 'info');
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

        document.getElementById('uploadForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.guardarSemana();
        });
    }

    async guardarSemana() {
        const unidad = document.getElementById('unidadSelect').value;
        const semana = document.getElementById('semanaSelect').value;
        const titulo = document.getElementById('tituloSemana').value;
        const descripcion = document.getElementById('descripcionSemana').value;
        const archivosInput = document.getElementById('archivosInput');
        const archivos = Array.from(archivosInput.files);

        if (!unidad || !semana) {
            this.showNotification('Selecciona unidad y semana', 'error');
            return;
        }

        if (!titulo) {
            this.showNotification('Ingresa un título', 'error');
            return;
        }

        if (archivos.length === 0) {
            this.showNotification('Selecciona al menos un archivo', 'error');
            return;
        }

        this.showNotification('⏳ Subiendo archivos a GitHub...', 'info');

        const key = `${unidad}-${semana}`;
        
        try {
            // Subir cada archivo a GitHub
            const archivosData = [];
            for (let file of archivos) {
                this.showNotification(`📤 Subiendo: ${file.name}`, 'info');
                const data = await this.uploadFileToGitHub(file);
                archivosData.push({
                    nombre: data.nombre,
                    url: data.url,
                    tipo: data.tipo,
                    tamaño: data.tamaño,
                    fecha: new Date().toLocaleDateString('es-ES')
                });
            }

            // Guardar en el objeto semanas
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

            // Guardar en GitHub
            await this.saveSemanasToGitHub();
            
            this.showNotification('🎉 ¡Trabajo guardado en GitHub! Tus compañeros ya pueden verlo', 'success');
            
            document.getElementById('uploadForm').reset();
            document.getElementById('filesPreview').innerHTML = '';
            this.renderSemanasList();
            this.renderUnidades();
            this.updateProgress();
            
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('❌ Error al subir: ' + error.message, 'error');
        }
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
                                    ${archivo.nombre.substring(0, 25)}${archivo.nombre.length > 25 ? '...' : ''}
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
        
        document.getElementById('modalDescripcion').innerHTML = `
            <strong>📝 Descripción:</strong><br>
            ${semana.descripcion || 'Sin descripción'}
        `;

        const archivosList = document.getElementById('modalArchivosList');
        archivosList.innerHTML = '';
        
        semana.archivos.forEach((archivo, index) => {
            const sizeKB = ((archivo.tamaño || 0) / 1024).toFixed(0);
            const item = document.createElement('div');
            item.className = 'archivo-item';
            
            const esPDF = archivo.tipo?.includes('pdf') || archivo.nombre?.toLowerCase().endsWith('.pdf');
            
            item.innerHTML = `
                <div class="archivo-info">
                    <i class="${this.getIconoArchivo(archivo.tipo)}" style="font-size: 1.5rem;"></i>
                    <div>
                        <strong>${archivo.nombre}</strong><br>
                        <small>${sizeKB} KB • ${archivo.fecha || ''}</small>
                    </div>
                </div>
                <div class="archivo-acciones">
                    ${esPDF ? `
                        <button class="btn-ver-archivo" onclick="app.verPDF('${archivo.url}', '${archivo.nombre}')">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                    ` : `
                        <button class="btn-ver-archivo" onclick="window.open('${archivo.url}', '_blank')">
                            <i class="fas fa-external-link-alt"></i> Abrir
                        </button>
                    `}
                    <button class="btn-descargar-archivo" onclick="app.descargarArchivo('${archivo.url}', '${archivo.nombre}')">
                        <i class="fas fa-download"></i> Descargar
                    </button>
                </div>
            `;
            archivosList.appendChild(item);
        });

        document.getElementById('pdfViewer').style.display = 'none';
        modal.style.display = 'block';
    }

    async verPDF(url, nombre) {
        const pdfViewer = document.getElementById('pdfViewer');
        const pdfTitle = document.getElementById('pdfTitle');
        
        this.showNotification(`📄 Cargando: ${nombre}`, 'info');
        
        pdfViewer.style.display = 'block';
        pdfTitle.textContent = nombre;
        
        try {
            // Cargar el PDF desde la URL
            const loadingTask = pdfjsLib.getDocument(url);
            this.pdfDoc = await loadingTask.promise;
            this.totalPages = this.pdfDoc.numPages;
            this.currentPageNum = 1;
            
            await this.renderPage(1);
            
            document.getElementById('pageInfo').textContent = `Página 1 de ${this.totalPages}`;
            document.getElementById('prevPageBtn').disabled = true;
            document.getElementById('nextPageBtn').disabled = this.totalPages <= 1;
            
            pdfViewer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            this.showNotification(`✅ PDF cargado: ${this.totalPages} páginas`, 'success');
            
        } catch (error) {
            console.error('Error cargando PDF:', error);
            // Fallback: abrir en nueva pestaña
            window.open(url, '_blank');
            this.showNotification('Abriendo PDF en nueva pestaña...', 'info');
        }
    }

    async renderPage(pageNum) {
        if (!this.pdfDoc) return;
        
        const page = await this.pdfDoc.getPage(pageNum);
        const canvas = document.getElementById('pdfCanvas');
        const ctx = canvas.getContext('2d');
        
        const viewport = page.getViewport({ scale: this.currentZoom });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        document.getElementById('pageInfo').textContent = `Página ${pageNum} de ${this.totalPages}`;
        document.getElementById('prevPageBtn').disabled = pageNum <= 1;
        document.getElementById('nextPageBtn').disabled = pageNum >= this.totalPages;
    }

    async nextPage() {
        if (this.pdfDoc && this.currentPageNum < this.totalPages) {
            this.currentPageNum++;
            await this.renderPage(this.currentPageNum);
        }
    }

    async prevPage() {
        if (this.pdfDoc && this.currentPageNum > 1) {
            this.currentPageNum--;
            await this.renderPage(this.currentPageNum);
        }
    }

    zoomIn() {
        this.currentZoom += 0.25;
        this.renderPage(this.currentPageNum);
    }

    zoomOut() {
        if (this.currentZoom > 0.5) {
            this.currentZoom -= 0.25;
            this.renderPage(this.currentPageNum);
        }
    }

    descargarArchivo(url, nombre) {
        const link = document.createElement('a');
        link.href = url;
        link.download = nombre;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showNotification(`📥 Descargando: ${nombre}`, 'success');
    }

    cerrarModal() {
        document.getElementById('modalSemana').style.display = 'none';
        document.getElementById('pdfViewer').style.display = 'none';
        this.pdfDoc = null;
    }

    getIconoArchivo(tipo) {
        if (!tipo) return 'fas fa-file';
        if (tipo.includes('pdf')) return 'fas fa-file-pdf';
        if (tipo.includes('ppt') || tipo.includes('presentation')) return 'fas fa-file-powerpoint';
        if (tipo.includes('doc') || tipo.includes('word')) return 'fas fa-file-word';
        if (tipo.includes('image')) return 'fas fa-file-image';
        return 'fas fa-file';
    }

    renderSemanasList() {
        const container = document.getElementById('semanasList');
        if (!container) return;

        const semanasArray = Object.entries(this.semanas);
        if (semanasArray.length === 0) {
            container.innerHTML = '<p style="color: var(--light-text); text-align: center; padding: 2rem;">No hay semanas configuradas</p>';
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

    async eliminarSemana(key) {
        if (confirm('¿Eliminar esta semana y todos sus archivos?')) {
            delete this.semanas[key];
            try {
                await this.saveSemanasToGitHub();
                this.renderSemanasList();
                this.renderUnidades();
                this.updateProgress();
                this.showNotification('Semana eliminada', 'info');
            } catch (e) {
                this.showNotification('Error al eliminar', 'error');
            }
        }
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
            font-weight: 500;
            max-width: 350px;
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