const fileBrowserModalProxy = {
    isOpen: false,
    isLoading: false,

    browser: {
        title: "Work Directory Browser",
        currentPath: "",
        entries: [],
        parentPath: "",
        sortBy: "name",
        sortDirection: "asc"
    },

    // Initialize navigation history
    history: [],

    async openModal() {
        const modalEl = document.getElementById('fileBrowserModal');
        const modalAD = Alpine.$data(modalEl);

        modalAD.isOpen = true;
        modalAD.isLoading = true;
        modalAD.history = []; // reset history when opening modal

        // Initialize currentPath to root if it's empty
        if (!modalAD.browser.currentPath) {
            modalAD.browser.currentPath = "";
        }

        await modalAD.fetchFiles(modalAD.browser.currentPath);
    },

    isArchive(filename) {
        const archiveExts = [ 'zip', 'tar', 'gz', 'rar', '7z' ];
        const ext = filename.split('.').pop().toLowerCase();
        return archiveExts.includes(ext);
    },

    async fetchFiles(path = "") {
        this.isLoading = true;
        try {
            const response = await fetch(`/get_work_dir_files?path=${encodeURIComponent(path)}`);

            if (response.ok) {
                const data = await response.json();
                this.browser.entries = data.data.entries;
                this.browser.currentPath = data.data.current_path;
                this.browser.parentPath = data.data.parent_path;
            } else {
                console.error('Error fetching files:', await response.text());
                this.browser.entries = [];
            }
        } catch (error) {
            console.error('Error fetching files:', error);
            this.browser.entries = [];
        } finally {
            this.isLoading = false;
        }
    },

    async navigateToFolder(path) {
        // Push current path to history before navigating
        if (this.browser.currentPath !== path) {
            this.history.push(this.browser.currentPath);
        }
        await this.fetchFiles(path);
    },

    async navigateUp() {
        if (this.browser.parentPath !== "") {
            // Push current path to history before navigating up
            this.history.push(this.browser.currentPath);
            await this.fetchFiles(this.browser.parentPath);
        }
    },

    sortFiles(entries) {
        return [ ...entries ].sort((a, b) => {
            // Folders always come first
            if (a.is_dir !== b.is_dir) {
                return a.is_dir ? -1 : 1;
            }

            const direction = this.browser.sortDirection === 'asc' ? 1 : -1;
            switch (this.browser.sortBy) {
                case 'name':
                    return direction * a.name.localeCompare(b.name);
                case 'size':
                    return direction * (a.size - b.size);
                case 'date':
                    return direction * (new Date(a.modified) - new Date(b.modified));
                default:
                    return 0;
            }
        });
    },

    toggleSort(column) {
        if (this.browser.sortBy === column) {
            this.browser.sortDirection = this.browser.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.browser.sortBy = column;
            this.browser.sortDirection = 'asc';
        }
    },

    async deleteFile(file) {
        if (!confirm(`Are you sure you want to delete ${file.name}?`)) {
            return;
        }

        try {
            const response = await fetch('/delete_work_dir_file', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    path: file.path,
                    currentPath: this.browser.currentPath
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.browser.entries = this.browser.entries.filter(entry => entry.path !== file.path);
                alert('File deleted successfully.');
            } else {
                alert(`Error deleting file: ${await response.text()}`);
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Error deleting file');
        }
    },

    async handleFileUpload(event) {
        try {
            const files = event.target.files;
            if (!files.length) return;

            const formData = new FormData();
            formData.append('path', this.browser.currentPath);

            for (let i = 0; i < files.length; i++) {
                const ext = files[ i ].name.split('.').pop().toLowerCase();
                if (![ 'zip', 'tar', 'gz', 'rar', '7z' ].includes(ext)) {
                    if (files[ i ].size > 100 * 1024 * 1024) { // 100MB
                        alert(`File ${files[ i ].name} exceeds the maximum allowed size of 100MB.`);
                        continue;
                    }
                }
                formData.append('files[]', files[ i ]);
            }

            // Proceed with upload after validation
            const response = await fetch('/upload_work_dir_files', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                // Update the file list with new data
                this.browser.entries = data.data.entries.map(entry => ({
                    ...entry,
                    uploadStatus: data.failed.includes(entry.name) ? 'failed' : 'success'
                }));
                this.browser.currentPath = data.data.current_path;
                this.browser.parentPath = data.data.parent_path;

                // Show success message
                if (data.failed && data.failed.length > 0) {
                    const failedFiles = data.failed.map(file => `${file.name}: ${file.error}`).join('\n');
                    alert(`Some files failed to upload:\n${failedFiles}`);
                }
            } else {

                alert(data.message);
            }

        } catch (error) {
            console.error('Error uploading files:', error);
            alert('Error uploading files');
        }
    },

    async downloadFile(file) {

        try {

            const downloadUrl = `/download_work_dir_file?path=${encodeURIComponent(file.path)}`;

            const response = await fetch(downloadUrl);


            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const blob = await response.blob();

            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(link.href);

        } catch (error) {

            console.error('Error downloading file:', error);
            alert('Error downloading file');
        }
    },

    // Helper Functions
    formatFileSize(size) {
        if (size === 0) return '0 Bytes';
        const k = 1024;
        const sizes = [ 'Bytes', 'KB', 'MB', 'GB', 'TB' ];
        const i = Math.floor(Math.log(size) / Math.log(k));
        return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[ i ];
    },

    formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    },

    handleClose() {
        this.isOpen = false;
    }
};

// Wait for Alpine to be ready
document.addEventListener('alpine:init', () => {
    Alpine.data('fileBrowserModalProxy', () => ({
        init() {
            Object.assign(this, fileBrowserModalProxy);
            // Ensure immediate file fetch when modal opens
            this.$watch('isOpen', async (value) => {
                if (value) {
                    await this.fetchFiles(this.browser.currentPath);
                }
            });
        }
    }));
});

// Keep the global assignment for backward compatibility
window.fileBrowserModalProxy = fileBrowserModalProxy;
