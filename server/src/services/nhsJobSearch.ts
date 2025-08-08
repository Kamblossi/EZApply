import axios from 'axios';
import * as cheerio from 'cheerio';
import { z } from 'zod';

// NHS Trac search criteria schema
export const NHSJobSearchSchema = z.object({
  keywords: z.string().min(1, 'Keywords are required'),
  location: z.string().optional(),
  radius: z.number().min(1).max(100).default(25), // miles
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  jobType: z.enum(['permanent', 'fixed_term', 'temporary', 'any']).default('any'),
  workingPattern: z.enum(['full_time', 'part_time', 'flexible', 'any']).default('any'),
  page: z.number().min(1).default(1),
  resultsPerPage: z.number().min(10).max(100).default(20)
});

export type NHSJobSearchCriteria = z.infer<typeof NHSJobSearchSchema>;

// Individual job result schema
export const JobResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  salary: z.string().optional(),
  url: z.string().url(),
  postedDate: z.string().optional(),
  deadline: z.string().optional(),
  description: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  jobType: z.string().optional(),
  workingPattern: z.string().optional(),
  trustOrganisation: z.string().optional(),
  band: z.string().optional()
});

export type JobResult = z.infer<typeof JobResultSchema>;

// Search results response schema
export const JobSearchResultsSchema = z.object({
  jobs: z.array(JobResultSchema),
  totalFound: z.number(),
  totalPages: z.number(),
  currentPage: z.number(),
  searchId: z.string(),
  searchCriteria: NHSJobSearchSchema,
  success: z.boolean(),
  error: z.string().optional()
});

export type JobSearchResults = z.infer<typeof JobSearchResultsSchema>;

export class NHSJobSearchService {
  private static readonly BASE_URL = 'https://www.jobs.nhs.uk';
  private static readonly SEARCH_URL = 'https://www.jobs.nhs.uk/xi/search_vacancy';
  private static readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  private static readonly TIMEOUT = 15000; // 15 seconds

  /**
   * Search for NHS jobs using the specified criteria
   */
  static async searchJobs(criteria: NHSJobSearchCriteria): Promise<JobSearchResults> {
    try {
      // Validate input criteria
      const validatedCriteria = NHSJobSearchSchema.parse(criteria);
      
      // Build search parameters
      const searchParams = this.buildSearchParams(validatedCriteria);
      
      // Perform the search request
      const response = await axios.get(this.SEARCH_URL, {
        params: searchParams,
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: this.TIMEOUT
      });

      if (response.status !== 200) {
        throw new Error(`NHS Jobs search failed: HTTP ${response.status}`);
      }

      // Parse the HTML response
      const $ = cheerio.load(response.data);
      
      // Extract job results
      const jobs = this.extractJobResults($);
      
      // Extract pagination info
      const paginationInfo = this.extractPaginationInfo($);
      
      // Generate search ID for tracking
      const searchId = this.generateSearchId(validatedCriteria);

      return {
        jobs,
        totalFound: paginationInfo.totalFound,
        totalPages: paginationInfo.totalPages,
        currentPage: validatedCriteria.page,
        searchId,
        searchCriteria: validatedCriteria,
        success: true
      };

    } catch (error: any) {
      console.error('NHS job search error:', error);
      
      return {
        jobs: [],
        totalFound: 0,
        totalPages: 0,
        currentPage: criteria.page || 1,
        searchId: '',
        searchCriteria: criteria,
        success: false,
        error: error.message || 'Failed to search NHS jobs'
      };
    }
  }

  /**
   * Build search parameters for NHS Jobs API
   */
  private static buildSearchParams(criteria: NHSJobSearchCriteria): Record<string, any> {
    const params: Record<string, any> = {
      keywords: criteria.keywords,
      action: 'search'
    };

    if (criteria.location) {
      params.location = criteria.location;
      params.distance = criteria.radius;
    }

    if (criteria.salaryMin) {
      params.salary_range_min = criteria.salaryMin;
    }

    if (criteria.salaryMax) {
      params.salary_range_max = criteria.salaryMax;
    }

    if (criteria.jobType !== 'any') {
      params.employment_type = criteria.jobType;
    }

    if (criteria.workingPattern !== 'any') {
      params.working_pattern = criteria.workingPattern;
    }

    // Pagination
    params.page = criteria.page;
    params.items_per_page = criteria.resultsPerPage;

    return params;
  }

  /**
   * Extract job results from NHS Jobs search page
   */
  private static extractJobResults($: cheerio.CheerioAPI): JobResult[] {
    const jobs: JobResult[] = [];
    
    // NHS Jobs uses various selectors for job listings
    const jobSelectors = [
      '.vacancy',
      '.job-listing',
      '.search-result',
      '[data-test="vacancy-item"]',
      '.vacancy-item'
    ];

    let jobElements: cheerio.Cheerio<any> | null = null;
    
    // Try different selectors to find job listings
    for (const selector of jobSelectors) {
      jobElements = $(selector);
      if (jobElements.length > 0) break;
    }

    if (!jobElements || jobElements.length === 0) {
      console.warn('No job listings found with any known selector');
      return jobs;
    }

    jobElements.each((index, element) => {
      try {
        const $job = $(element);
        
        const job = this.extractSingleJob($job);
        if (job) {
          jobs.push(job);
        }
      } catch (error) {
        console.warn(`Failed to extract job at index ${index}:`, error);
      }
    });

    return jobs;
  }

  /**
   * Extract data from a single job listing element
   */
  private static extractSingleJob($job: cheerio.Cheerio<any>): JobResult | null {
    try {
      // Extract job URL and ID
      const linkElement = $job.find('a[href*="/vacancy/"], a[href*="/xi/vacancy/"]').first();
      const relativeUrl = linkElement.attr('href');
      
      if (!relativeUrl) {
        console.warn('No job URL found');
        return null;
      }

      const url = relativeUrl.startsWith('http') ? relativeUrl : `${this.BASE_URL}${relativeUrl}`;
      const id = this.extractJobIdFromUrl(url);

      // Extract job title
      const title = linkElement.text().trim() || 
                   $job.find('.vacancy-title, .job-title, h2, h3').first().text().trim();

      if (!title) {
        console.warn('No job title found');
        return null;
      }

      // Extract other job details
      const company = $job.find('.organisation, .employer, .trust-name').first().text().trim() || 'NHS';
      const location = $job.find('.location, .vacancy-location').first().text().trim();
      const salary = $job.find('.salary, .pay-range, .salary-range').first().text().trim();
      const description = $job.find('.description, .vacancy-description').first().text().trim();
      const postedDate = $job.find('.posted-date, .date-posted').first().text().trim();
      const deadline = $job.find('.closing-date, .deadline').first().text().trim();
      const band = $job.find('.band, .pay-band').first().text().trim();

      return {
        id,
        title,
        company,
        location,
        salary: salary || undefined,
        url,
        postedDate: postedDate || undefined,
        deadline: deadline || undefined,
        description: description || undefined,
        trustOrganisation: company !== 'NHS' ? company : undefined,
        band: band || undefined,
        requirements: this.extractRequirements(description)
      };

    } catch (error) {
      console.warn('Failed to extract job data:', error);
      return null;
    }
  }

  /**
   * Extract pagination information from search results page
   */
  private static extractPaginationInfo($: cheerio.CheerioAPI): { totalFound: number; totalPages: number } {
    // Try to find total results count
    const resultsText = $('.results-count, .search-results-count, .total-results').first().text();
    const totalMatch = resultsText.match(/(\d+)/);
    const totalFound = totalMatch ? parseInt(totalMatch[1]) : 0;

    // Calculate total pages (assuming default page size)
    const totalPages = Math.ceil(totalFound / 20);

    return { totalFound, totalPages };
  }

  /**
   * Extract job ID from NHS Jobs URL
   */
  private static extractJobIdFromUrl(url: string): string {
    const matches = url.match(/\/vacancy\/(\d+)/);
    return matches ? matches[1] : `nhs_${Date.now()}`;
  }

  /**
   * Extract requirements from job description
   */
  private static extractRequirements(description: string): string[] {
    if (!description) return [];

    const requirements: string[] = [];
    const text = description.toLowerCase();

    // Healthcare specific patterns
    const healthcarePatterns = [
      /\b(nmc registration|nursing|rn|rgn|rmn|rnld)\b/g,
      /\b(hcpc registration|physiotherapy|occupational therapy)\b/g,
      /\b(degree|diploma|qualification|certification)\b/g,
      /\b(patient care|clinical|healthcare)\b/g,
      /\b(band [678]|agenda for change)\b/g
    ];

    // General patterns
    const generalPatterns = [
      /\b(communication|teamwork|leadership|management)\b/g,
      /\b(microsoft office|excel|word|computer skills)\b/g,
      /\b(driving licence|car|transport)\b/g
    ];

    [...healthcarePatterns, ...generalPatterns].forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        requirements.push(...matches);
      }
    });

    // Remove duplicates and limit
    return [...new Set(requirements)].slice(0, 8);
  }

  /**
   * Generate a unique search ID for tracking
   */
  private static generateSearchId(criteria: NHSJobSearchCriteria): string {
    const timestamp = Date.now();
    const hash = Buffer.from(JSON.stringify(criteria)).toString('base64').slice(0, 8);
    return `nhs_search_${timestamp}_${hash}`;
  }

  /**
   * Get search suggestions based on keywords
   */
  static getSearchSuggestions(query: string): string[] {
    const suggestions = [
      'Software Developer',
      'Nurse',
      'Healthcare Assistant',
      'Physiotherapist',
      'Radiographer',
      'Pharmacist',
      'IT Support',
      'Data Analyst',
      'Project Manager',
      'Administrative Assistant'
    ];

    if (!query.trim()) return suggestions.slice(0, 5);

    const filtered = suggestions.filter(suggestion => 
      suggestion.toLowerCase().includes(query.toLowerCase())
    );

    return filtered.length > 0 ? filtered : suggestions.slice(0, 3);
  }

  /**
   * Get location suggestions for NHS job searches
   */
  static getLocationSuggestions(query: string): string[] {
    const locations = [
      'London',
      'Birmingham',
      'Manchester',
      'Leeds',
      'Liverpool',
      'Sheffield',
      'Bristol',
      'Newcastle',
      'Nottingham',
      'Leicester'
    ];

    if (!query.trim()) return locations.slice(0, 5);

    const filtered = locations.filter(location => 
      location.toLowerCase().includes(query.toLowerCase())
    );

    return filtered.length > 0 ? filtered : locations.slice(0, 3);
  }
}
