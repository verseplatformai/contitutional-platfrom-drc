import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const SubmitProposal = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    subject: '',
    one_sentence: '',
    content: '',
    category: 'constitutional',
    acceptTerms: false
  });

  const [images, setImages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [uploadProgress, setUploadProgress] = useState({});

  // Image dropzone
  const onImageDrop = useCallback((acceptedFiles) => {
    const newImages = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));
    setImages(prev => [...prev, ...newImages].slice(0, 5)); // Max 5 images
  }, []);

  const { getRootProps: getImageRootProps, getInputProps: getImageInputProps, isDragActive: isImageDragActive } = useDropzone({
    onDrop: onImageDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    },
    maxFiles: 5,
    maxSize: 5 * 1024 * 1024 // 5MB
  });

  // Document dropzone
  const onDocumentDrop = useCallback((acceptedFiles) => {
    const newDocs = acceptedFiles.map(file => ({
      file,
      name: file.name,
      size: file.size
    }));
    setDocuments(prev => [...prev, ...newDocs].slice(0, 3)); // Max 3 documents
  }, []);

  const { getRootProps: getDocRootProps, getInputProps: getDocInputProps, isDragActive: isDocDragActive } = useDropzone({
    onDrop: onDocumentDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 3,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const removeImage = (index) => {
    URL.revokeObjectURL(images[index].preview);
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeDocument = (index) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleContentChange = (value) => {
    setFormData(prev => ({ ...prev, content: value }));
    if (errors.content) {
      setErrors(prev => ({ ...prev, content: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.subject.trim()) {
      newErrors.subject = 'Le sujet est obligatoire';
    } else if (formData.subject.length > 250) {
      newErrors.subject = `Le sujet ne doit pas dépasser 250 caractères (${formData.subject.length}/250)`;
    }

    if (!formData.one_sentence.trim()) {
      newErrors.one_sentence = 'Le résumé en une phrase est obligatoire';
    }

    if (!formData.content || formData.content.replace(/<[^>]*>/g, '').trim().length < 50) {
      newErrors.content = 'Le contenu détaillé doit contenir au moins 50 caractères';
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'Vous devez accepter les conditions de soumission';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadFile = async (file, bucket, path) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // 1. Upload images
      const imageUrls = [];
      for (let i = 0; i < images.length; i++) {
        setUploadProgress(prev => ({ ...prev, [`image_${i}`]: 'uploading' }));
        const ext = images[i].file.name.split('.').pop();
        const path = `${user.id}/${Date.now()}_${i}.${ext}`;
        const url = await uploadFile(images[i].file, 'proposal-images', path);
        imageUrls.push(url);
        setUploadProgress(prev => ({ ...prev, [`image_${i}`]: 'done' }));
      }

      // 2. Upload documents
      const documentUrls = [];
      for (let i = 0; i < documents.length; i++) {
        setUploadProgress(prev => ({ ...prev, [`doc_${i}`]: 'uploading' }));
        const ext = documents[i].file.name.split('.').pop();
        const path = `${user.id}/${Date.now()}_doc_${i}.${ext}`;
        const url = await uploadFile(documents[i].file, 'proposal-files', path);
        documentUrls.push(url);
        setUploadProgress(prev => ({ ...prev, [`doc_${i}`]: 'done' }));
      }

      // 3. Create proposal in database
      const { data: proposal, error: dbError } = await supabase
        .from('proposals')
        .insert({
          user_id: user.id,
          subject: formData.subject.trim(),
          one_sentence: formData.one_sentence.trim(),
          content: formData.content,
          image_urls: imageUrls,
          file_urls: documentUrls,
          category: formData.category,
          status: 'published',
          yes_count: 0,
          no_count: 0
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 4. Redirect to the new proposal
      navigate(`/proposals/${proposal.id}`);
    } catch (error) {
      console.error('Error submitting proposal:', error);
      setSubmitError(error.message || 'Une erreur est survenue lors de la soumission');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quill editor modules
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      ['link'],
      ['clean']
    ]
  };

  const categories = [
    { value: 'constitutional', label: 'Réforme Constitutionnelle' },
    { value: 'electoral', label: 'Système Électoral' },
    { value: 'decentralization', label: 'Décentralisation' },
    { value: 'justice', label: 'Justice & Droits' },
    { value: 'economy', label: 'Économie & Développement' },
    { value: 'security', label: 'Sécurité & Défense' },
    { value: 'education', label: 'Éducation' },
    { value: 'health', label: 'Santé' },
    { value: 'other', label: 'Autre' }
  ];

  return (
    <>
      <Helmet>
        <title>Soumettre une Proposition | MAONI v100.04</title>
      </Helmet>

      <div className="container" style={{ paddingTop: 'var(--space-2xl)', paddingBottom: 'var(--space-3xl)' }}>
        <motion.div
          className="form-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ maxWidth: '900px' }}
        >
          <h2 className="form-title">
            ✍️ Soumettre une Proposition
          </h2>

          <p style={{ 
            textAlign: 'center', 
            color: 'var(--gray-600)',
            marginBottom: 'var(--space-xl)'
          }}>
            Partagez votre vision pour l'avenir constitutionnel de la RDC
          </p>

          {/* Guidelines */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              padding: 'var(--space-lg)',
              background: '#f0f9ff',
              border: '1px solid var(--drc-blue)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 'var(--space-xl)'
            }}
          >
            <h4 style={{ color: 'var(--drc-blue)', marginBottom: 'var(--space-sm)' }}>
              📋 Directives de soumission
            </h4>
            <ul style={{ fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: 1.8 }}>
              <li>Soyez clair et constructif dans votre proposition</li>
              <li>Respectez les valeurs démocratiques et l'unité nationale</li>
              <li>Évitez les propos haineux, discriminatoires ou violents</li>
              <li>Apportez des arguments pour soutenir votre position</li>
              <li>Vous pouvez joindre des documents pour étayer votre proposition</li>
            </ul>
          </motion.div>

          {/* Error */}
          {submitError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                padding: 'var(--space-md)',
                background: '#fef2f2',
                border: '1px solid var(--error)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--error)',
                marginBottom: 'var(--space-lg)',
                textAlign: 'center'
              }}
            >
              ❌ {submitError}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Category */}
            <div className="form-group">
              <label className="form-label form-required">
                Catégorie
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="form-select"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div className="form-group">
              <label className="form-label form-required">
                {t('proposals.subject')}
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className={`form-input ${errors.subject ? 'error' : ''}`}
                placeholder="Ex: Modification de l'article 220 de la Constitution"
                maxLength={250}
              />
              <div className="form-help">
                {formData.subject.length}/250 caractères
              </div>
              {errors.subject && <div className="form-error">{errors.subject}</div>}
            </div>

            {/* One Sentence Summary */}
            <div className="form-group">
              <label className="form-label form-required">
                {t('proposals.summary')}
              </label>
              <textarea
                name="one_sentence"
                value={formData.one_sentence}
                onChange={handleChange}
                className={`form-textarea ${errors.one_sentence ? 'error' : ''}`}
                placeholder="Résumez votre proposition en une phrase percutante"
                rows={2}
                maxLength={500}
              />
              <div className="form-help">
                Une phrase claire qui résume votre proposition (max 500 caractères)
              </div>
              {errors.one_sentence && <div className="form-error">{errors.one_sentence}</div>}
            </div>

            {/* Detailed Content - Rich Text Editor */}
            <div className="form-group">
              <label className="form-label form-required">
                {t('proposals.content')}
              </label>
              <div style={{ 
                border: errors.content ? '2px solid var(--error)' : '1px solid var(--gray-300)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden'
              }}>
                <ReactQuill
                  theme="snow"
                  value={formData.content}
                  onChange={handleContentChange}
                  modules={quillModules}
                  placeholder="Développez votre proposition en détail... (minimum 50 caractères)"
                  style={{ minHeight: '300px' }}
                />
              </div>
              {errors.content && <div className="form-error">{errors.content}</div>}
              <div className="form-help">
                Vous pouvez formater votre texte, ajouter des listes, des citations, etc.
              </div>
            </div>

            {/* Image Upload */}
            <div className="form-group">
              <label className="form-label">
                Images (optionnel - max 5)
              </label>
              <div
                {...getImageRootProps()}
                style={{
                  padding: 'var(--space-xl)',
                  border: `2px dashed ${isImageDragActive ? 'var(--drc-blue)' : 'var(--gray-300)'}`,
                  borderRadius: 'var(--radius-lg)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: isImageDragActive ? '#f0f9ff' : 'var(--gray-50)',
                  transition: 'all 0.3s ease',
                  marginBottom: 'var(--space-md)'
                }}
              >
                <input {...getImageInputProps()} />
                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>
                  📸
                </div>
                {isImageDragActive ? (
                  <p style={{ color: 'var(--drc-blue)', fontWeight: 600 }}>
                    Déposez les images ici...
                  </p>
                ) : (
                  <>
                    <p style={{ fontWeight: 600, color: 'var(--gray-700)' }}>
                      Glissez-déposez des images ici
                    </p>
                    <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>
                      ou cliquez pour sélectionner (JPG, PNG, GIF - max 5MB)
                    </p>
                  </>
                )}
              </div>

              {/* Image Previews */}
              {images.length > 0 && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: 'var(--space-md)'
                }}>
                  {images.map((img, index) => (
                    <div key={index} style={{ position: 'relative' }}>
                      <img
                        src={img.preview}
                        alt={`Upload ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '120px',
                          objectFit: 'cover',
                          borderRadius: 'var(--radius-md)'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        style={{
                          position: 'absolute',
                          top: '5px',
                          right: '5px',
                          background: 'var(--error)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px'
                        }}
                      >
                        ×
                      </button>
                      {uploadProgress[`image_${index}`] === 'uploading' && (
                        <div style={{ 
                          textAlign: 'center', 
                          fontSize: '0.8rem',
                          color: 'var(--drc-blue)' 
                        }}>
                          Envoi...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Document Upload */}
            <div className="form-group">
              <label className="form-label">
                Documents (optionnel - max 3)
              </label>
              <div
                {...getDocRootProps()}
                style={{
                  padding: 'var(--space-xl)',
                  border: `2px dashed ${isDocDragActive ? 'var(--drc-blue)' : 'var(--gray-300)'}`,
                  borderRadius: 'var(--radius-lg)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: isDocDragActive ? '#f0f9ff' : 'var(--gray-50)',
                  transition: 'all 0.3s ease',
                  marginBottom: 'var(--space-md)'
                }}
              >
                <input {...getDocInputProps()} />
                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>
                  📄
                </div>
                {isDocDragActive ? (
                  <p style={{ color: 'var(--drc-blue)', fontWeight: 600 }}>
                    Déposez les documents ici...
                  </p>
                ) : (
                  <>
                    <p style={{ fontWeight: 600, color: 'var(--gray-700)' }}>
                      Glissez-déposez des documents ici
                    </p>
                    <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>
                      ou cliquez pour sélectionner (PDF, Word - max 10MB)
                    </p>
                  </>
                )}
              </div>

              {/* Document List */}
              {documents.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {documents.map((doc, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 'var(--space-md)',
                        background: 'var(--gray-50)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--gray-200)'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--gray-700)' }}>
                          📎 {doc.name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                          {(doc.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--error)',
                          cursor: 'pointer',
                          fontSize: '1.2rem'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Terms Acceptance */}
            <div className="form-group">
              <div className="form-checkbox">
                <input
                  type="checkbox"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  id="acceptTerms"
                />
                <label htmlFor="acceptTerms" style={{ cursor: 'pointer' }}>
                  Je confirme que ma proposition respecte les valeurs démocratiques, 
                  l'unité nationale et les lois de la RDC. Je certifie que ce contenu 
                  n'est pas haineux, discriminatoire ou violent.
                </label>
              </div>
              {errors.acceptTerms && <div className="form-error">{errors.acceptTerms}</div>}
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              className="btn btn-primary btn-lg btn-block"
              disabled={isSubmitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ marginTop: 'var(--space-xl)' }}
            >
              {isSubmitting ? (
                <>
                  <span className="loading-spinner" style={{ width: '20px', height: '20px' }} />
                  Soumission en cours...
                </>
              ) : (
                '🚀 Soumettre ma proposition'
              )}
            </motion.button>
          </form>

          {/* Character Count Summary */}
          <div style={{ 
            marginTop: 'var(--space-lg)', 
            padding: 'var(--space-md)',
            background: 'var(--gray-50)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            color: 'var(--gray-600)'
          }}>
            <strong>Résumé :</strong> {formData.subject.length}/250 caractères (sujet) | 
            {' '}{formData.content.replace(/<[^>]*>/g, '').length} caractères (contenu)
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default SubmitProposal;