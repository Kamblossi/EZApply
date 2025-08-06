import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Grid,
  Dialog,
  DialogContent,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Close,
  Download,
  Delete,
  Refresh,
  MoreVert,
  ZoomIn,
  Schedule
} from '@mui/icons-material';

interface Screenshot {
  filename: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
  url: string;
}

const ScreenshotGallery: React.FC = () => {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<Screenshot | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);

  useEffect(() => {
    loadScreenshots();
  }, []);

  const loadScreenshots = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/uploads/screenshots', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setScreenshots(data.screenshots);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load screenshots');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (screenshot: Screenshot) => {
    try {
      const response = await fetch(screenshot.url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = screenshot.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      setError('Failed to download screenshot');
    }
  };

  const handleDelete = async (screenshot: Screenshot) => {
    if (!confirm(`Are you sure you want to delete ${screenshot.filename}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/uploads/screenshot/${screenshot.filename}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setScreenshots(prev => prev.filter(s => s.filename !== screenshot.filename));
        setMenuAnchor(null);
        setSelectedScreenshot(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete screenshot');
      }
    } catch (err) {
      setError('Network error occurred');
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, screenshot: Screenshot) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedScreenshot(screenshot);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedScreenshot(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getJobIdFromFilename = (filename: string) => {
    const match = filename.match(/automation-(\d+)/);
    return match ? match[1] : null;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Automation Screenshots</Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadScreenshots}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && screenshots.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No screenshots available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Screenshots will appear here when automation jobs are run
          </Typography>
        </Box>
      )}

      <Grid container spacing={2}>
        {screenshots.map((screenshot) => {
          const jobId = getJobIdFromFilename(screenshot.filename);
          
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={screenshot.filename}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-2px)' }
                }}
                onClick={() => setSelectedImage(screenshot)}
              >
                <CardMedia
                  component="img"
                  height={200}
                  image={screenshot.url}
                  alt={screenshot.filename}
                  sx={{ objectFit: 'cover' }}
                />
                
                <CardContent sx={{ position: 'relative' }}>
                  <IconButton
                    size="small"
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                    onClick={(e) => handleMenuOpen(e, screenshot)}
                  >
                    <MoreVert />
                  </IconButton>

                  <Typography variant="body2" noWrap sx={{ mb: 1 }}>
                    {screenshot.filename}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Schedule fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(screenshot.createdAt)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(screenshot.size)}
                    </Typography>
                    {jobId && (
                      <Chip 
                        label={`Job ${jobId}`} 
                        size="small" 
                        variant="outlined"
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Full-size image dialog */}
      <Dialog
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { bgcolor: 'transparent', boxShadow: 'none' }
        }}
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          {selectedImage && (
            <>
              <IconButton
                onClick={() => setSelectedImage(null)}
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                  color: 'white',
                  zIndex: 1,
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' }
                }}
              >
                <Close />
              </IconButton>
              
              <Box
                component="img"
                src={selectedImage.url}
                alt={selectedImage.filename}
                sx={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '90vh',
                  objectFit: 'contain',
                  borderRadius: 1
                }}
              />
              
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: 16,
                  right: 16,
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  p: 2,
                  borderRadius: 1
                }}
              >
                <Typography variant="h6" gutterBottom>
                  {selectedImage.filename}
                </Typography>
                <Typography variant="body2">
                  Created: {formatDate(selectedImage.createdAt)} | Size: {formatFileSize(selectedImage.size)}
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{ sx: { minWidth: 150 } }}
      >
        <MenuItem 
          onClick={() => {
            if (selectedScreenshot) {
              setSelectedImage(selectedScreenshot);
            }
            handleMenuClose();
          }}
        >
          <ZoomIn sx={{ mr: 1 }} />
          View Full Size
        </MenuItem>
        
        <MenuItem 
          onClick={() => {
            if (selectedScreenshot) {
              handleDownload(selectedScreenshot);
            }
            handleMenuClose();
          }}
        >
          <Download sx={{ mr: 1 }} />
          Download
        </MenuItem>
        
        <MenuItem 
          onClick={() => {
            if (selectedScreenshot) {
              handleDelete(selectedScreenshot);
            }
          }}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ScreenshotGallery;
