import { z } from 'zod';
import * as cheerio from 'cheerio';

// Define the structure for parsed job data
export const ParsedJobDataSchema = z.object({
  title: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  salary: z.string().optional(),
  deadline: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  jobType: z.string().optional(),
  postedDate: z.string().optional(),
  success: z.boolean(),
  error: z.string().optional(),
  source: z.string().optional()
});

export type ParsedJobData = z.infer<typeof ParsedJobDataSchema>;

export class JobUrlParserService {
  private static readonly TIMEOUT = 10000; // 10 seconds timeout
  private static readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

  /**
   * Parse a job URL and extract job information
   */
  static async parseJobUrl(url: string): Promise<ParsedJobData> {
    try {
      // Validate URL format
      const urlObj = new URL(url);
      
      // Determine parser based on domain
      const hostname = urlObj.hostname.toLowerCase();
      
      if (hostname.includes('jobs.nhs.uk') || hostname.includes('trac.jobs')) {
        return await this.parseNHSJob(url);
      } else if (hostname.includes('indeed.')) {
        return await this.parseIndeedJob(url);
      } else if (hostname.includes('linkedin.com')) {
        return await this.parseLinkedInJob(url);
      } else if (hostname.includes('reed.co.uk')) {
        return await this.parseReedJob(url);
      } else {
        return await this.parseGenericJob(url);
      }
    } catch (error) {
      console.error('Error parsing job URL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse job URL',
        source: url
      };
    }
  }

  /**
   * Parse NHS Jobs/Trac job posting
   */
  private static async parseNHSJob(url: string): Promise<ParsedJobData> {
    try {
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);

      // NHS Jobs specific selectors
      const title = $('h1.vacancy-header__title, .vacancy-title, h1').first().text().trim();
      const company = $('.vacancy-header__organisation, .organisation-name, .employer').first().text().trim();
      const location = $('.vacancy-header__location, .location, .vacancy-location').first().text().trim();
      const salary = $('.vacancy-header__salary, .salary, .pay-range').first().text().trim();
      const description = $('.vacancy-description, .job-description, .description').first().text().trim();
      const deadline = $('.vacancy-header__closing, .closing-date, .deadline').first().text().trim();

      // Extract requirements from job description
      const requirements = this.extractRequirements(description);

      return {
        title: title || undefined,
        company: company || 'NHS',
        location: location || undefined,
        description: description || undefined,
        salary: salary || undefined,
        deadline: deadline || undefined,
        requirements,
        jobType: 'Healthcare',
        success: true,
        source: 'NHS Jobs'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse NHS job: ${error instanceof Error ? error.message : 'Unknown error'}`,
        source: 'NHS Jobs'
      };
    }
  }

  /**
   * Parse Indeed job posting
   */
  private static async parseIndeedJob(url: string): Promise<ParsedJobData> {
    try {
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);

      const title = $('h1[data-testid="jobsearch-JobInfoHeader-title"], .jobsearch-JobInfoHeader-title').first().text().trim();
      const company = $('[data-testid="inlineHeader-companyName"], .jobsearch-CompanyInfoContainer').first().text().trim();
      const location = $('[data-testid="job-location"], .jobsearch-JobInfoHeader-subtitle').first().text().trim();
      const description = $('#jobDescriptionText, .jobsearch-jobDescriptionText').first().text().trim();
      const salary = $('[data-testid="job-salary"], .jobsearch-JobMetadataHeader-item').first().text().trim();

      return {
        title: title || undefined,
        company: company || undefined,
        location: location || undefined,
        description: description || undefined,
        salary: salary || undefined,
        success: true,
        source: 'Indeed'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse Indeed job: ${error instanceof Error ? error.message : 'Unknown error'}`,
        source: 'Indeed'
      };
    }
  }

  /**
   * Parse LinkedIn job posting
   */
  private static async parseLinkedInJob(url: string): Promise<ParsedJobData> {
    try {
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);

      const title = $('h1.job-title, .jobs-unified-top-card__job-title').first().text().trim();
      const company = $('.jobs-unified-top-card__company-name, .job-company').first().text().trim();
      const location = $('.jobs-unified-top-card__bullet, .job-location').first().text().trim();
      const description = $('.jobs-description-content__text, .job-description').first().text().trim();

      return {
        title: title || undefined,
        company: company || undefined,
        location: location || undefined,
        description: description || undefined,
        success: true,
        source: 'LinkedIn'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse LinkedIn job: ${error instanceof Error ? error.message : 'Unknown error'}`,
        source: 'LinkedIn'
      };
    }
  }

  /**
   * Parse Reed.co.uk job posting
   */
  private static async parseReedJob(url: string): Promise<ParsedJobData> {
    try {
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);

      const title = $('h1.job-title, .job-header h1').first().text().trim();
      const company = $('.job-company, .recruiter-name').first().text().trim();
      const location = $('.job-location, .location').first().text().trim();
      const salary = $('.job-salary, .salary').first().text().trim();
      const description = $('.job-description, .description').first().text().trim();

      return {
        title: title || undefined,
        company: company || undefined,
        location: location || undefined,
        description: description || undefined,
        salary: salary || undefined,
        success: true,
        source: 'Reed'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse Reed job: ${error instanceof Error ? error.message : 'Unknown error'}`,
        source: 'Reed'
      };
    }
  }

  /**
   * Generic job parser for unknown sites
   */
  private static async parseGenericJob(url: string): Promise<ParsedJobData> {
    try {
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);

      // Generic selectors that might work on various sites
      const title = $('h1, .job-title, .position-title, .vacancy-title').first().text().trim();
      const company = $('.company, .employer, .organization, .company-name').first().text().trim();
      const location = $('.location, .job-location, .address').first().text().trim();
      const description = $('.description, .job-description, .content, .summary').first().text().trim();

      return {
        title: title || undefined,
        company: company || undefined,
        location: location || undefined,
        description: description || undefined,
        success: true,
        source: 'Generic'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse generic job: ${error instanceof Error ? error.message : 'Unknown error'}`,
        source: 'Generic'
      };
    }
  }

  /**
   * Fetch HTML content from URL with proper headers and timeout
   */
  private static async fetchHtml(url: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.text();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Extract requirements/skills from job description
   */
  private static extractRequirements(description: string): string[] {
    if (!description) return [];

    const requirements: string[] = [];
    const text = description.toLowerCase();

    // Common skills and requirements patterns
    const patterns = [
      // Technical skills
      /\b(javascript|typescript|react|node\.?js|python|java|c\#|php|sql|html|css)\b/g,
      // Healthcare specific
      /\b(nursing|healthcare|medical|clinical|patient care|nmc registration)\b/g,
      // General skills
      /\b(communication|teamwork|leadership|management|analysis|problem.?solving)\b/g,
      // Education
      /\b(degree|diploma|certification|qualification|training)\b/g,
    ];

    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        requirements.push(...matches);
      }
    });

    // Remove duplicates and return unique requirements
    return [...new Set(requirements)].slice(0, 10); // Limit to 10 requirements
  }

  /**
   * Get list of supported job sites
   */
  static getSupportedSites(): string[] {
    return [
      'jobs.nhs.uk',
      'trac.jobs',
      'indeed.com',
      'indeed.co.uk',
      'linkedin.com',
      'reed.co.uk'
    ];
  }

  /**
   * Check if a URL is from a supported job site
   */
  static isSupportedSite(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return this.getSupportedSites().some(site => hostname.includes(site));
    } catch {
      return false;
    }
  }
}
