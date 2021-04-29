import { select } from "@wordpress/data";
import { __, sprintf } from "@wordpress/i18n";
import { YOAST_SCHEMA_BLOCKS_STORE_NAME } from "../redux";
import { BlockValidation, BlockValidationResult } from "../../core/validation";
import { getHumanReadableBlockName } from "../BlockHelper";
import { BlockPresence } from "../../core/validation/BlockValidationResult";
import { getAllDescendantIssues } from "../validators";

type clientIdValidation = Record<string, BlockValidationResult>;

/**
 * A warning message for in the sidebar schema analysis.
 */
export type SidebarWarning = {
	/**
	 * The warning message.
	 */
	text: string;

	/**
	 * Color of the warning.
	 */
	color: "red" | "orange" | "green";
}

/**
 * Gets the validation results from the store for a block instance with the given clientId.
 *
 * @param clientId The clientId to request validation results for.
 *
 * @returns {BlockValidationResult} The validation results, or null if none were found.
 */
function getValidationResult( clientId: string ): BlockValidationResult | null {
	const validationResults: clientIdValidation = select( YOAST_SCHEMA_BLOCKS_STORE_NAME ).getSchemaBlocksValidationResults();
	if ( ! validationResults ) {
		return null;
	}

	return validationResults[ clientId ];
}

/**
 * Adds analysis conclusions to the footer.
 *
 * @param validation The validation result for the current block.
 *
 * @returns Any analysis conclusions that should be in the footer.
 */
function getAnalysisConclusion( validation: BlockValidationResult ): SidebarWarning {
	let conclusionText = "";

	// Show a red bullet when the block is invalid.
	if ( validation.result >= BlockValidation.Invalid ) {
		conclusionText = sprintf(
			/* translators: %s expands to the schema block name. */
			__( "Not all required blocks have been completed! No %s schema will be generated for your page.", "yoast-schema-blocks" ),
			sanitizeParentName( getHumanReadableBlockName( validation.name ) ),
		);

		return { text: conclusionText, color: "red" };
	}

	conclusionText = __( "Good job! All required blocks have been completed.", "yoast-schema-blocks" );

	return { text: conclusionText, color: "green" };
}

/**
 * Get a list of (red) error messages.
 *
 * @param issues The block validation issues.
 *
 * @return The error messages.
 */
function getErrorMessages( issues: BlockValidationResult[] ): SidebarWarning[] {
	const requiredBlockIssues = issues.filter( issue => issue.message && issue.blockPresence === BlockPresence.Required );

	return requiredBlockIssues.map( issue => ( {
		color: "red",
		text: issue.message,
	} ) );
}

/**
 * Get a list of (orange) warning messages.
 *
 * @param issues The block validation issues.
 *
 * @return The warning messages.
 */
function getWarningMessages( issues: BlockValidationResult[] ): SidebarWarning[] {
	const recommendedBlockIssues = issues.filter( issue => issue.message && issue.blockPresence === BlockPresence.Recommended );

	return recommendedBlockIssues.map( issue => ( {
		color: "orange",
		text: issue.message,
	} ) );
}

/**
 * Creates an array of warning messages from a block validation result.
 *
 * @param validation The block being validated.
 *
 * @returns {SidebarWarning[]} The formatted warnings.
 */
export function createAnalysisMessages( validation: BlockValidationResult ): SidebarWarning[] {
	const issues = getAllDescendantIssues( validation );

	const messages = [];

	messages.push( ...getErrorMessages( issues ) );
	messages.push( ...getWarningMessages( issues ) );

	messages.push( getAnalysisConclusion( validation ) );

	return messages;
}

/**
 * Strips "Yoast " of the name of the block and converts the string to lower case.
 *
 * @param parent The parent block name.
 *
 * @returns {string} The sanitized parent block name.
 */
export function sanitizeParentName( parent: string ): string {
	if ( parent.startsWith( "Yoast " ) ) {
		return parent.substr( 6 ).toLowerCase();
	}

	return parent.toLowerCase();
}

/**
 * Converts the validation results for a block instance with the given clientId to a presentable text.
 *
 * @param clientId The clientId to request validation results for.
 *
 * @returns {string} The presentable warning message, or null if no warnings are found.
 */
export default function getWarnings( clientId: string ): SidebarWarning[] {
	const validation: BlockValidationResult = getValidationResult( clientId );
	if ( ! validation ) {
		return null;
	}

	return createAnalysisMessages( validation );
}