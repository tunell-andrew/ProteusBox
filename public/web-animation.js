class WebAnimation {
    constructor(canvasId) {
        console.log('WebAnimation constructor called with canvasId:', canvasId);
        this.canvas = document.getElementById(canvasId);
        console.log('Canvas element found:', !!this.canvas);
        
        if (!this.canvas) {
            console.error('Canvas not found with ID:', canvasId);
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.nodes = [];
        this.connections = [];
        this.animationId = null;
        
        // Default colors (will be updated from CSS custom properties)
        this.colors = {
            primary: '#330099',
            primaryRgb: [51, 0, 153],
            light: '#420cc6',
            lightRgb: [66, 12, 198],
            backgroundRgb: [8, 0, 23]
        };
        
        this.init();
        this.updateColorsFromCSS();
        
        // Delay node creation until canvas is properly sized
        setTimeout(() => {
            this.createNodes();
            this.animate();
            console.log('Animation started for canvas:', canvasId);
        }, 50);
        
        window.addEventListener('resize', () => this.resize());
    }
    
    init() {
        this.resize();
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '-10';
        this.canvas.style.pointerEvents = 'none';
        console.log(`Canvas ${this.canvas.id} positioned with z-index:`, this.canvas.style.zIndex);
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        console.log('Canvas resized to:', this.canvas.width, 'x', this.canvas.height);
    }
    
    updateColorsFromCSS() {
        const root = document.documentElement;
        const primaryColor = getComputedStyle(root).getPropertyValue('--primary-color').trim();
        const primaryLight = getComputedStyle(root).getPropertyValue('--primary-light').trim();
        const animationBg = getComputedStyle(root).getPropertyValue('--animation-bg').trim();
        
        console.log(`[${this.canvas.id}] Reading colors from CSS:`, {
            primaryColor,
            primaryLight,
            animationBg
        });
        
        if (primaryColor && primaryColor !== '') {
            this.colors.primary = primaryColor;
            this.colors.primaryRgb = this.hexToRgb(primaryColor);
        }
        
        if (primaryLight && primaryLight !== '') {
            this.colors.light = primaryLight;
            // Handle both hex and rgb formats for primary-light
            if (primaryLight.startsWith('#')) {
                this.colors.lightRgb = this.hexToRgb(primaryLight);
            } else if (primaryLight.startsWith('rgb')) {
                this.colors.lightRgb = this.parseRgbString(primaryLight);
            }
        }
        
        if (animationBg && animationBg !== '') {
            this.colors.backgroundRgb = this.parseRgbString(animationBg);
        }
        
        console.log(`[${this.canvas.id}] Final colors:`, this.colors);
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [51, 0, 153]; // fallback
    }
    
    parseRgbString(rgbStr) {
        const match = rgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        return match ? [
            parseInt(match[1]),
            parseInt(match[2]),
            parseInt(match[3])
        ] : [8, 0, 23]; // fallback
    }
    
    updateColors(primaryColor, variations) {
        this.colors.primary = primaryColor;
        this.colors.primaryRgb = this.hexToRgb(primaryColor);
        
        if (variations && variations.light) {
            // Parse RGB string like "rgb(66, 12, 198)"
            const rgbMatch = variations.light.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (rgbMatch) {
                this.colors.lightRgb = [
                    parseInt(rgbMatch[1]),
                    parseInt(rgbMatch[2]),
                    parseInt(rgbMatch[3])
                ];
            }
        }
        
        if (variations && variations.animationBg) {
            this.colors.backgroundRgb = this.parseRgbString(variations.animationBg);
        }
    }
    
    createNodes() {
        const nodeCount = Math.floor((this.canvas.width * this.canvas.height) / 20000);
        this.nodes = [];
        console.log('Creating', nodeCount, 'nodes for canvas', this.canvas.width, 'x', this.canvas.height);
        
        for (let i = 0; i < nodeCount; i++) {
            this.nodes.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                radius: Math.random() * 4 + 3
            });
        }
        console.log('Created', this.nodes.length, 'nodes');
    }
    
    updateNodes() {
        this.nodes.forEach(node => {
            node.x += node.vx;
            node.y += node.vy;
            
            // Wrap around edges
            if (node.x < 0) node.x = this.canvas.width;
            if (node.x > this.canvas.width) node.x = 0;
            if (node.y < 0) node.y = this.canvas.height;
            if (node.y > this.canvas.height) node.y = 0;
            
            // Slight direction changes for organic movement
            if (Math.random() < 0.01) {
                node.vx += (Math.random() - 0.5) * 0.1;
                node.vy += (Math.random() - 0.5) * 0.1;
                
                // Limit velocity
                const maxVel = 1;
                if (Math.abs(node.vx) > maxVel) node.vx = Math.sign(node.vx) * maxVel;
                if (Math.abs(node.vy) > maxVel) node.vy = Math.sign(node.vy) * maxVel;
            }
        });
    }
    
    findConnections() {
        this.connections = [];
        const maxDistance = 200;
        
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const dx = this.nodes[i].x - this.nodes[j].x;
                const dy = this.nodes[i].y - this.nodes[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < maxDistance) {
                    this.connections.push({
                        nodeA: this.nodes[i],
                        nodeB: this.nodes[j],
                        opacity: 1 - (distance / maxDistance)
                    });
                }
            }
        }
    }
    
    draw() {
        // Clear with transparent background to show CSS gradient behind
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw connections
        this.connections.forEach(connection => {
            this.ctx.beginPath();
            this.ctx.moveTo(connection.nodeA.x, connection.nodeA.y);
            this.ctx.lineTo(connection.nodeB.x, connection.nodeB.y);
            this.ctx.strokeStyle = `rgba(${this.colors.primaryRgb[0]}, ${this.colors.primaryRgb[1]}, ${this.colors.primaryRgb[2]}, ${connection.opacity * 0.8})`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });
        
        // Draw nodes
        this.nodes.forEach(node => {
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${this.colors.primaryRgb[0]}, ${this.colors.primaryRgb[1]}, ${this.colors.primaryRgb[2]}, 0.4)`;
            this.ctx.fill();
            
            // Add inner glow with lighter color
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius * 0.6, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${this.colors.lightRgb[0]}, ${this.colors.lightRgb[1]}, ${this.colors.lightRgb[2]}, 0.6)`;
            this.ctx.fill();
        });
    }
    
    animate() {
        this.updateNodes();
        this.findConnections();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    // Add debug method to check if animation is running
    logStatus() {
        console.log(`Animation status: ${this.nodes.length} nodes, ${this.connections.length} connections, animating: ${!!this.animationId}`);
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}

// Global animation instances
let webAnimationInstance = null;
let adminAnimationInstance = null;

// Function to initialize admin animation
function initAdminAnimation() {
    const adminCanvas = document.getElementById('adminWebBackground');
    console.log('Trying to init admin animation, canvas found:', !!adminCanvas);
    console.log('Canvas dimensions:', adminCanvas ? `${adminCanvas.width}x${adminCanvas.height}` : 'N/A');
    console.log('Canvas visible:', adminCanvas ? !adminCanvas.closest('.hidden') : 'N/A');
    
    if (adminCanvas && !adminAnimationInstance) {
        try {
            adminAnimationInstance = new WebAnimation('adminWebBackground');
            
            // Force color update after initialization to ensure latest colors are used
            setTimeout(() => {
                if (adminAnimationInstance) {
                    adminAnimationInstance.updateColorsFromCSS();
                    console.log('Admin animation colors refreshed');
                }
            }, 100);
            
            console.log('Admin animation initialized successfully');
        } catch (error) {
            console.error('Error initializing admin animation:', error);
        }
    } else if (adminAnimationInstance) {
        // If already exists, just refresh colors to ensure they're current
        adminAnimationInstance.updateColorsFromCSS();
        console.log('Admin animation already exists, colors refreshed');
    }
}

// Initialize animation when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Initialize homepage animation if canvas exists
    const homeCanvas = document.getElementById('webBackground');
    if (homeCanvas) {
        webAnimationInstance = new WebAnimation('webBackground');
    }
    
    // Don't initialize admin animation here - it will be called when admin page is shown
});

// Make the admin animation initialization available globally
window.initAdminAnimation = initAdminAnimation;

// Global function to update animation colors
window.updateAnimationColors = function(primaryColor, variations) {
    console.log('Updating animation colors for all instances:', { primaryColor, variations });
    
    if (webAnimationInstance) {
        webAnimationInstance.updateColors(primaryColor, variations);
        console.log('Homepage animation colors updated');
    }
    if (adminAnimationInstance) {
        adminAnimationInstance.updateColors(primaryColor, variations);
        // Also force a refresh from CSS to ensure consistency
        adminAnimationInstance.updateColorsFromCSS();
        console.log('Admin animation colors updated');
    }
};