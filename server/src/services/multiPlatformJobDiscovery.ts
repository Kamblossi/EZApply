import axios from 'axios';
import * as cheerio from 'cheerio';
import { z } from 'zod';
import { NHSJobSearchService, NHSJobSearchSchema } from './nhsJobSearch';

// =====================================================================
// Multi-Platform Job Discovery Service
// =====================================================================

// Enhanced search schema supporting multiple platforms
export const JobSearchSchema = z.object({
  keywords: z.string().min(1, 'Keywords are required'),
  location: z.string().optional(),
  radius: z.number().min(1).max(100).default(25),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  jobType: z.enum(['permanent', 'temporary', 'contract', 'bank', 'apprenticeship']).optional(),
  platforms: z.array(z.enum(['nhs', 'indeed', 'linkedin', 'reed', 'totaljobs'])).default(['nhs']),
  experience: z.enum(['entry', 'mid', 'senior', 'executive']).optional(),
  workPattern: z.enum(['full-time', 'part-time', 'flexible', 'remote']).optional(),
  sector: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(20) // Added limit property
});

export type JobSearchCriteria = z.infer<typeof JobSearchSchema>;

export interface JobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  url: string;
  description?: string; // Made optional to match NHS service
  requirements?: string[];
  benefits?: string[];
  postedDate?: string;
  deadline?: string;
  platform: string;
  jobType?: string;
  workPattern?: string;
  experience?: string;
  sector?: string;
  score?: number; // Job matching score
  trustOrganisation?: string; // For NHS jobs
  band?: string; // For NHS jobs
}

export interface PlatformSearchResults {
  success: boolean;
  platform: string;
  totalFound: number;
  jobs: JobResult[];
  errors?: string[];
  searchTime: number;
}

export interface AggregatedSearchResults {
  searchId: string;
  totalJobs: number;
  platforms: Record<string, PlatformSearchResults>;
  searchCriteria: JobSearchCriteria;
  searchTime: number;
  recommendations?: JobResult[];
}

// =====================================================================
// Indeed Job Search Service
// =====================================================================
class IndeedJobSearchService {
  private static readonly BASE_URL = 'https://uk.indeed.com';
  
  static async searchJobs(criteria: JobSearchCriteria): Promise<PlatformSearchResults> {
    const startTime = Date.now();
    
    try {
      const searchParams = new URLSearchParams({
        q: criteria.keywords,
        l: criteria.location || '',
        radius: criteria.radius?.toString() || '25',
        sort: 'date',
        limit: '50'
      });

      if (criteria.salaryMin) {
        searchParams.append('salary', `£${criteria.salaryMin}+`);
      }

      const response = await axios.get(`${this.BASE_URL}/jobs?${searchParams}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const jobs: JobResult[] = [];

      $('.job_seen_beacon, [data-jk]').each((index, element) => {
        try {
          const $job = $(element);
          const job = this.extractJobData($job, $);
          if (job) {
            jobs.push(job);
          }
        } catch (error) {
          console.warn('Failed to extract Indeed job:', error);
        }
      });

      return {
        success: true,
        platform: 'indeed',
        totalFound: jobs.length,
        jobs: jobs.slice(0, 20), // Limit results
        searchTime: Date.now() - startTime
      };

    } catch (error: any) {
      console.error('Indeed search failed:', error);
      return {
        success: false,
        platform: 'indeed',
        totalFound: 0,
        jobs: [],
        errors: [error.message],
        searchTime: Date.now() - startTime
      };
    }
  }

  private static extractJobData($job: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): JobResult | null {
    try {
      const titleElement = $job.find('[data-testid="job-title"] a, .jobTitle a').first();
      const title = titleElement.text().trim();
      const relativeUrl = titleElement.attr('href');
      
      if (!title || !relativeUrl) return null;

      const url = relativeUrl.startsWith('http') ? relativeUrl : `${this.BASE_URL}${relativeUrl}`;
      const company = $job.find('[data-testid="company-name"], .companyName').text().trim();
      const location = $job.find('[data-testid="job-location"], .companyLocation').text().trim();
      const salary = $job.find('.salary-snippet, .estimated-salary').text().trim();
      const description = $job.find('.summary, [data-testid="job-snippet"]').text().trim();

      // Extract job ID from URL
      const jobIdMatch = relativeUrl.match(/jk=([^&]+)/);
      const id = jobIdMatch ? jobIdMatch[1] : `indeed_${Date.now()}_${Math.random()}`;

      return {
        id,
        title,
        company: company || 'Company not specified',
        location: location || 'Location not specified',
        salary: salary || undefined,
        url,
        description,
        platform: 'indeed',
        postedDate: this.extractPostedDate($job),
        requirements: this.extractRequirements(description)
      };
    } catch (error) {
      console.warn('Failed to extract Indeed job data:', error);
      return null;
    }
  }

  private static extractPostedDate($job: cheerio.Cheerio<any>): string | undefined {
    const dateText = $job.find('.date, [data-testid="job-age"]').text().trim();
    if (dateText.includes('day')) {
      const days = parseInt(dateText.match(/(\d+)/)?.[1] || '0');
      const date = new Date();
      date.setDate(date.getDate() - days);
      return date.toISOString().split('T')[0];
    }
    return undefined;
  }

  private static extractRequirements(description: string): string[] {
    const requirements: string[] = [];
    const commonRequirements = [
      'degree', 'qualification', 'experience', 'skills', 'certification',
      'license', 'training', 'knowledge', 'proficiency'
    ];
    
    commonRequirements.forEach(req => {
      if (description.toLowerCase().includes(req)) {
        requirements.push(req);
      }
    });
    
    return requirements;
  }
}

// =====================================================================
// Reed Job Search Service
// =====================================================================
class ReedJobSearchService {
  private static readonly BASE_URL = 'https://www.reed.co.uk';
  
  static async searchJobs(criteria: JobSearchCriteria): Promise<PlatformSearchResults> {
    const startTime = Date.now();
    
    try {
      const searchParams = new URLSearchParams({
        keywords: criteria.keywords,
        location: criteria.location || '',
        distance: criteria.radius?.toString() || '25',
        sortby: 'date'
      });

      if (criteria.salaryMin) {
        searchParams.append('salaryfrom', criteria.salaryMin.toString());
      }
      if (criteria.salaryMax) {
        searchParams.append('salaryto', criteria.salaryMax.toString());
      }

      const response = await axios.get(`${this.BASE_URL}/jobs?${searchParams}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const jobs: JobResult[] = [];

      $('.job-result, .job-card').each((index, element) => {
        try {
          const $job = $(element);
          const job = this.extractJobData($job, $);
          if (job) {
            jobs.push(job);
          }
        } catch (error) {
          console.warn('Failed to extract Reed job:', error);
        }
      });

      return {
        success: true,
        platform: 'reed',
        totalFound: jobs.length,
        jobs: jobs.slice(0, 20),
        searchTime: Date.now() - startTime
      };

    } catch (error: any) {
      console.error('Reed search failed:', error);
      return {
        success: false,
        platform: 'reed',
        totalFound: 0,
        jobs: [],
        errors: [error.message],
        searchTime: Date.now() - startTime
      };
    }
  }

  private static extractJobData($job: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): JobResult | null {
    try {
      const titleElement = $job.find('.job-title a, h3 a').first();
      const title = titleElement.text().trim();
      const relativeUrl = titleElement.attr('href');
      
      if (!title || !relativeUrl) return null;

      const url = relativeUrl.startsWith('http') ? relativeUrl : `${this.BASE_URL}${relativeUrl}`;
      const company = $job.find('.company, .company-name').text().trim();
      const location = $job.find('.location, .job-location').text().trim();
      const salary = $job.find('.salary, .job-salary').text().trim();
      const description = $job.find('.description, .job-description').text().trim();

      const jobIdMatch = relativeUrl.match(/jobs\/(\d+)/);
      const id = jobIdMatch ? jobIdMatch[1] : `reed_${Date.now()}_${Math.random()}`;

      return {
        id,
        title,
        company: company || 'Company not specified',
        location: location || 'Location not specified',
        salary: salary || undefined,
        url,
        description,
        platform: 'reed'
      };
    } catch (error) {
      return null;
    }
  }
}

// =====================================================================
// Multi-Platform Job Discovery Service
// =====================================================================
export class MultiPlatformJobDiscoveryService {
  static async searchAllPlatforms(criteria: JobSearchCriteria): Promise<AggregatedSearchResults> {
    const searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // Validate search criteria
    const validatedCriteria = JobSearchSchema.parse(criteria);
    
    const platformPromises: Promise<PlatformSearchResults>[] = [];
    
    // Search each requested platform
    if (validatedCriteria.platforms.includes('nhs')) {
      // Map job type from our schema to NHS schema
      const mapJobType = (jobType?: string): 'permanent' | 'temporary' | 'any' | 'fixed_term' => {
        switch (jobType) {
          case 'contract': return 'fixed_term';
          case 'bank': return 'temporary';
          case 'apprenticeship': return 'fixed_term';
          default: return jobType as 'permanent' | 'temporary' | 'any' || 'any';
        }
      };

      // Map work pattern from our schema to NHS schema  
      const mapWorkPattern = (workPattern?: string): 'any' | 'flexible' | 'full_time' | 'part_time' => {
        switch (workPattern) {
          case 'full-time': return 'full_time';
          case 'part-time': return 'part_time';
          case 'remote': return 'flexible';
          default: return workPattern as 'any' | 'flexible' || 'any';
        }
      };

      platformPromises.push(
        NHSJobSearchService.searchJobs({
          keywords: validatedCriteria.keywords,
          location: validatedCriteria.location,
          radius: validatedCriteria.radius || 25,
          salaryMin: validatedCriteria.salaryMin,
          salaryMax: validatedCriteria.salaryMax,
          jobType: mapJobType(validatedCriteria.jobType),
          workingPattern: mapWorkPattern(validatedCriteria.workPattern),
          page: 1,
          resultsPerPage: validatedCriteria.limit || 20
        }).then(nhsResults => ({
          success: nhsResults.success,
          platform: 'nhs',
          totalFound: nhsResults.totalFound,
          jobs: nhsResults.jobs.map(job => ({
            ...job,
            platform: 'nhs' as const,
            score: 0.8, // Default score for NHS jobs
            description: job.description || '', // Provide default empty string
          })),
          errors: nhsResults.error ? [nhsResults.error] : [],
          searchTime: 0
        })).catch(error => ({
          success: false,
          platform: 'nhs',
          totalFound: 0,
          jobs: [],
          errors: [error.message],
          searchTime: 0
        }))
      );
    }
    
    if (validatedCriteria.platforms.includes('indeed')) {
      platformPromises.push(IndeedJobSearchService.searchJobs(validatedCriteria));
    }
    
    if (validatedCriteria.platforms.includes('reed')) {
      platformPromises.push(ReedJobSearchService.searchJobs(validatedCriteria));
    }
    
    // Wait for all searches to complete
    const platformResults = await Promise.all(platformPromises);
    
    // Aggregate results
    const platforms: Record<string, PlatformSearchResults> = {};
    let totalJobs = 0;
    
    platformResults.forEach(result => {
      platforms[result.platform] = result;
      if (result.success) {
        totalJobs += result.totalFound;
      }
    });
    
    // Get all jobs for recommendations
    const allJobs = platformResults
      .filter(result => result.success)
      .flatMap(result => result.jobs);
    
    // Generate job recommendations
    const recommendations = this.generateRecommendations(allJobs, validatedCriteria);
    
    return {
      searchId,
      totalJobs,
      platforms,
      searchCriteria: validatedCriteria,
      searchTime: Date.now() - startTime,
      recommendations
    };
  }

  private static generateRecommendations(jobs: JobResult[], criteria: JobSearchCriteria): JobResult[] {
    // Score jobs based on criteria match
    const scoredJobs = jobs.map(job => {
      let score = 0;
      
      // Title relevance
      const titleWords = criteria.keywords.toLowerCase().split(' ');
      const jobTitleLower = job.title.toLowerCase();
      titleWords.forEach(word => {
        if (jobTitleLower.includes(word)) score += 10;
      });
      
      // Location preference
      if (criteria.location && job.location.toLowerCase().includes(criteria.location.toLowerCase())) {
        score += 5;
      }
      
      // Salary match
      if (job.salary && criteria.salaryMin) {
        const salaryNumbers = job.salary.match(/\d+/g);
        if (salaryNumbers) {
          const jobSalary = parseInt(salaryNumbers[0]);
          if (jobSalary >= criteria.salaryMin) score += 8;
        }
      }
      
      // Recent posting bonus
      if (job.postedDate) {
        const daysAgo = Math.floor((Date.now() - new Date(job.postedDate).getTime()) / (1000 * 60 * 60 * 24));
        if (daysAgo <= 7) score += 3;
      }
      
      // Platform reliability bonus
      if (job.platform === 'nhs') score += 2; // NHS jobs are typically more reliable
      
      return { ...job, score };
    });
    
    // Return top 10 recommendations sorted by score
    return scoredJobs
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 10);
  }

  static getSupportedPlatforms(): Array<{
    id: string;
    name: string;
    description: string;
    features: string[];
    isActive: boolean;
  }> {
    return [
      {
        id: 'nhs',
        name: 'NHS Trac',
        description: 'Official NHS job board with healthcare positions',
        features: ['Healthcare jobs', 'NHS Trust positions', 'Detailed job specs', 'Application tracking'],
        isActive: true
      },
      {
        id: 'indeed',
        name: 'Indeed',
        description: 'Global job search engine with diverse opportunities',
        features: ['Wide job variety', 'Company reviews', 'Salary insights', 'Quick apply'],
        isActive: true
      },
      {
        id: 'reed',
        name: 'Reed',
        description: 'UK recruitment agency with professional roles',
        features: ['Professional roles', 'Recruitment support', 'Career advice', 'Salary guides'],
        isActive: true
      },
      {
        id: 'linkedin',
        name: 'LinkedIn Jobs',
        description: 'Professional network job opportunities',
        features: ['Network connections', 'Company insights', 'Professional growth', 'Industry news'],
        isActive: false // To be implemented
      },
      {
        id: 'totaljobs',
        name: 'Totaljobs',
        description: 'UK job board with career development tools',
        features: ['Career tools', 'CV builder', 'Interview tips', 'Market insights'],
        isActive: false // To be implemented
      }
    ];
  }

  static getJobCategories(): string[] {
    return [
      'Healthcare & Medical',
      'Engineering & Technology',
      'Finance & Accounting',
      'Education & Training',
      'Sales & Marketing',
      'Administration & Support',
      'Legal & Compliance',
      'Human Resources',
      'Operations & Logistics',
      'Creative & Design',
      'Research & Development',
      'Customer Service',
      'Management & Leadership',
      'Consulting & Strategy'
    ];
  }
}
