/* Plugin Stats Panel for Obsidian */
// Implemented in plain JavaScript for simplicity

const { Plugin, Modal } = require('obsidian');

class PluginStatsModal extends Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Estadísticas de Plugins' });

        const manifests = this.app.plugins.manifests;
        const pluginIDs = Object.keys(manifests);
        const total = pluginIDs.length;
        const enabled = Array.from(this.app.plugins.enabledPlugins || []);

        contentEl.createEl('p', { text: `Plugins instalados: ${total}` });
        contentEl.createEl('p', { text: `Plugins activos: ${enabled.length}` });

        const listEl = contentEl.createEl('ul');
        pluginIDs.forEach(id => {
            const manifest = manifests[id];
            const active = enabled.includes(id);
            listEl.createEl('li', {
                text: `${manifest.name} (${manifest.version}) - ${active ? 'Activo' : 'Inactivo'}`
            });
        });

        contentEl.createEl('h3', { text: 'Registro de eventos' });
        const logEl = contentEl.createEl('ul');
        this.plugin.eventLog.slice(-10).forEach(entry => {
            logEl.createEl('li', { text: `${entry.time}: ${entry.message}` });
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}

module.exports = class PluginStatsPlugin extends Plugin {
    constructor(app, manifest) {
        super(app, manifest);
        this.eventLog = [];
        this.originalEnable = null;
        this.originalDisable = null;
    }

    log(message) {
        this.eventLog.push({ time: new Date().toLocaleString(), message });
        if (this.eventLog.length > 50) {
            this.eventLog.shift();
        }
    }

    patchPluginManager() {
        const manager = this.app.plugins;
        if (!manager) return;
        this.originalEnable = manager.enablePlugin.bind(manager);
        this.originalDisable = manager.disablePlugin.bind(manager);

        manager.enablePlugin = async (id) => {
            const result = await this.originalEnable(id);
            this.log(`Activado: ${id}`);
            return result;
        };

        manager.disablePlugin = async (id) => {
            const result = await this.originalDisable(id);
            this.log(`Desactivado: ${id}`);
            return result;
        };
    }

    async onload() {
        this.patchPluginManager();

        this.addRibbonIcon('list-checks', 'Mostrar estadísticas de plugins', () => {
            new PluginStatsModal(this.app, this).open();
        });

        this.addCommand({
            id: 'show-plugin-stats',
            name: 'Mostrar estadísticas de plugins',
            callback: () => {
                new PluginStatsModal(this.app, this).open();
            }
        });
    }

    onunload() {
        const manager = this.app.plugins;
        if (this.originalEnable) manager.enablePlugin = this.originalEnable;
        if (this.originalDisable) manager.disablePlugin = this.originalDisable;
    }
};
