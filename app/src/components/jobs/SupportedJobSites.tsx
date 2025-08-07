import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Collapse,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckIcon,
  Language as WebsiteIcon
} from '@mui/icons-material';

interface SupportedSite {
  name: string;
  domains: string[];
  features: string[];
}

const SUPPORTED_SITES: SupportedSite[] = [
  {
    name: 'NHS Jobs',
    domains: ['jobs.nhs.uk', 'trac.jobs'],
    features: ['Full parsing', 'Auto-fill all fields', 'Requirements extraction']
  },
  {
    name: 'Indeed',
    domains: ['indeed.com', 'indeed.co.uk'],
    features: ['Title & company', 'Location & description', 'Salary information']
  },
  {
    name: 'LinkedIn',
    domains: ['linkedin.com/jobs'],
    features: ['Basic job details', 'Company information', 'Job description']
  },
  {
    name: 'Reed',
    domains: ['reed.co.uk'],
    features: ['Full job parsing', 'Salary & location', 'Company details']
  },
  {
    name: 'Generic Sites',
    domains: ['Any job posting website'],
    features: ['Best effort parsing', 'Basic information extraction']
  }
];

export const SupportedJobSites = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [supportedSites, setSupportedSites] = useState<string[]>([]);

  const loadSupportedSites = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/jobs/supported-sites', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ez-token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSupportedSites(data.sites || []);
      }
    } catch (error) {
      console.error('Failed to load supported sites:', error);
    }
  };

  useEffect(() => {
    if (isExpanded && supportedSites.length === 0) {
      loadSupportedSites();
    }
  }, [isExpanded, supportedSites.length]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Button
        onClick={handleToggle}
        variant="text"
        size="small"
        startIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{ 
          textTransform: 'none',
          color: 'text.secondary',
          fontSize: '0.875rem'
        }}
      >
        {isExpanded ? 'Hide' : 'Show'} supported job sites
      </Button>

      <Collapse in={isExpanded}>
        <Box sx={{ mt: 1, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
            🔗 Supported Job Sites for Auto-Fill
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2, fontSize: '0.875rem' }}>
            Paste URLs from these sites to automatically extract job details
          </Alert>

          <List dense>
            {SUPPORTED_SITES.map((site, index) => (
              <ListItem key={index} sx={{ py: 1 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <CheckIcon color="success" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {site.name}
                      </Typography>
                      {site.domains.map((domain, idx) => (
                        <Chip
                          key={idx}
                          label={domain}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.75rem', height: 20 }}
                        />
                      ))}
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {site.features.join(' • ')}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>

          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WebsiteIcon fontSize="small" />
              Don't see your job site? We'll attempt to parse it anyway using generic extraction methods.
            </Typography>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};
