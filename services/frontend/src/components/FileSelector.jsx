import React, { useRef } from 'react';
import { Form, InputGroup, Button } from 'react-bootstrap';
import { FaUpload } from 'react-icons/fa';

/**
 * Reusable file selector component with dropdown and upload button
 * @param {string} value - Currently selected file/directory name
 * @param {function} onChange - Callback when selection changes
 * @param {function} onUpload - Callback when file(s) uploaded (receives event)
 * @param {array} availableFiles - Array of available files/directories
 * @param {boolean} uploading - Whether upload is in progress
 * @param {function} fileFilter - Optional filter function for available files (default: all)
 * @param {boolean} allowDirectory - Whether to allow directory upload
 * @param {string} placeholder - Placeholder text for dropdown
 */
export default function FileSelector({
    value,
    onChange,
    onUpload,
    availableFiles = [],
    uploading = false,
    fileFilter = () => true,
    allowDirectory = false,
    placeholder = '-- Select file --'
}) {
    const fileInputRef = useRef(null);

    const filteredFiles = availableFiles.filter(fileFilter);

    return (
        <InputGroup>
            <Form.Control
                as="select"
                value={value || ''}
                onChange={onChange}
            >
                <option value="">{placeholder}</option>
                {filteredFiles.map(file => (
                    <option key={file.name} value={file.name}>
                        {file.type === 'directory' ? '📁' : '📄'} {file.name}
                    </option>
                ))}
            </Form.Control>
            <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={onUpload}
                {...(allowDirectory ? { webkitdirectory: 'true', mozdirectory: 'true' } : {})}
            />
            <Button
                variant="outline-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
            >
                <FaUpload />
            </Button>
        </InputGroup>
    );
}
