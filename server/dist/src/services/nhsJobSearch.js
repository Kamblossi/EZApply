"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NHSJobSearchService = exports.JobSearchResultsSchema = exports.JobResultSchema = exports.NHSJobSearchSchema = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const zod_1 = require("zod");
// NHS Trac search criteria schema
exports.NHSJobSearchSchema = zod_1.z.object({
    keywords: zod_1.z.string().min(1, 'Keywords are required'),
    location: zod_1.z.string().optional(),
    radius: zod_1.z.number().min(1).max(100).default(25), // miles
    salaryMin: zod_1.z.number().optional(),
    salaryMax: zod_1.z.number().optional(),
    jobType: zod_1.z.enum(['permanent', 'fixed_term', 'temporary', 'any']).default('any'),
    workingPattern: zod_1.z.enum(['full_time', 'part_time', 'flexible', 'any']).default('any'),
    page: zod_1.z.number().min(1).default(1),
    resultsPerPage: zod_1.z.number().min(10).max(100).default(20)
});
// Individual job result schema
exports.JobResultSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    company: zod_1.z.string(),
    location: zod_1.z.string(),
    salary: zod_1.z.string().optional(),
    url: zod_1.z.string().url(),
    postedDate: zod_1.z.string().optional(),
    deadline: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    requirements: zod_1.z.array(zod_1.z.string()).optional(),
    jobType: zod_1.z.string().optional(),
    workingPattern: zod_1.z.string().optional(),
    trustOrganisation: zod_1.z.string().optional(),
    band: zod_1.z.string().optional()
});
// Search results response schema
exports.JobSearchResultsSchema = zod_1.z.object({
    jobs: zod_1.z.array(exports.JobResultSchema),
    totalFound: zod_1.z.number(),
    totalPages: zod_1.z.number(),
    currentPage: zod_1.z.number(),
    searchId: zod_1.z.string(),
    searchCriteria: exports.NHSJobSearchSchema,
    success: zod_1.z.boolean(),
    error: zod_1.z.string().optional()
});
class NHSJobSearchService {
    /**
     * Search for NHS jobs using the specified criteria
     */
    static searchJobs(criteria) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate input criteria
                const validatedCriteria = exports.NHSJobSearchSchema.parse(criteria);
                // Build search parameters
                const searchParams = this.buildSearchParams(validatedCriteria);
                // Perform the search request
                const response = yield axios_1.default.get(this.SEARCH_URL, {
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
            }
            catch (error) {
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
        });
    }
    /**
     * Build search parameters for NHS Jobs API
     */
    static buildSearchParams(criteria) {
        const params = {
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
    static extractJobResults($) {
        const jobs = [];
        // NHS Jobs uses various selectors for job listings
        const jobSelectors = [
            '.vacancy',
            '.job-listing',
            '.search-result',
            '[data-test="vacancy-item"]',
            '.vacancy-item'
        ];
        let jobElements = null;
        // Try different selectors to find job listings
        for (const selector of jobSelectors) {
            jobElements = $(selector);
            if (jobElements.length > 0)
                break;
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
            }
            catch (error) {
                console.warn(`Failed to extract job at index ${index}:`, error);
            }
        });
        return jobs;
    }
    /**
     * Extract data from a single job listing element
     */
    static extractSingleJob($job) {
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
        }
        catch (error) {
            console.warn('Failed to extract job data:', error);
            return null;
        }
    }
    /**
     * Extract pagination information from search results page
     */
    static extractPaginationInfo($) {
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
    static extractJobIdFromUrl(url) {
        const matches = url.match(/\/vacancy\/(\d+)/);
        return matches ? matches[1] : `nhs_${Date.now()}`;
    }
    /**
     * Extract requirements from job description
     */
    static extractRequirements(description) {
        if (!description)
            return [];
        const requirements = [];
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
    static generateSearchId(criteria) {
        const timestamp = Date.now();
        const hash = Buffer.from(JSON.stringify(criteria)).toString('base64').slice(0, 8);
        return `nhs_search_${timestamp}_${hash}`;
    }
    /**
     * Get search suggestions based on keywords
     */
    static getSearchSuggestions(query) {
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
        if (!query.trim())
            return suggestions.slice(0, 5);
        const filtered = suggestions.filter(suggestion => suggestion.toLowerCase().includes(query.toLowerCase()));
        return filtered.length > 0 ? filtered : suggestions.slice(0, 3);
    }
    /**
     * Get location suggestions for NHS job searches
     */
    static getLocationSuggestions(query) {
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
        if (!query.trim())
            return locations.slice(0, 5);
        const filtered = locations.filter(location => location.toLowerCase().includes(query.toLowerCase()));
        return filtered.length > 0 ? filtered : locations.slice(0, 3);
    }
}
exports.NHSJobSearchService = NHSJobSearchService;
NHSJobSearchService.BASE_URL = 'https://www.jobs.nhs.uk';
NHSJobSearchService.SEARCH_URL = 'https://www.jobs.nhs.uk/xi/search_vacancy';
NHSJobSearchService.USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
NHSJobSearchService.TIMEOUT = 15000; // 15 seconds
