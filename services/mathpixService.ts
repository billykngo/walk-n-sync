// services/mathpixService.ts

const MATHPIX_API_URL = 'https://api.mathpix.com/v3';

// Helper function for polling with a delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const extractTextWithMathpix = async (
    appId: string,
    appKey: string,
    file: File,
    updateStatus: (message: string) => void
): Promise<string> => {
    if (!appId || !appKey) {
        throw new Error("Mathpix App ID and App Key must be provided in the settings to process this file type.");
    }

    // 1. Upload the file to get a converter_id
    updateStatus(`Uploading ${file.name} to Mathpix...`);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('options_json', JSON.stringify({
        conversion_formats: { "md": true }, // Request markdown output
        math_inline_delimiters: ["$", "$"],
        math_display_delimiters: ["$$", "$$"]
    }));

    const uploadResponse = await fetch(`${MATHPIX_API_URL}/converter`, {
        method: 'POST',
        headers: {
            'app_id': appId,
            'app_key': appKey,
        },
        body: formData,
    });

    if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        const errorMessage = errorData.error_info?.message || errorData.error || uploadResponse.statusText;
        throw new Error(`Mathpix upload failed: ${errorMessage}`);
    }

    const uploadResult = await uploadResponse.json();
    const converterId = uploadResult.converter_id;

    if (!converterId) {
        if (uploadResult.error || uploadResult.error_info) {
           const errorMessage = uploadResult.error_info?.message || uploadResult.error || 'Unknown error from Mathpix API.';
           throw new Error(`Mathpix API Error: ${errorMessage}`);
        }
        console.error("Mathpix did not return a converter_id", uploadResult);
        throw new Error("Mathpix did not return a processing ID after upload.");
    }

    // 2. Poll for the result
    updateStatus('Processing document with Mathpix...');
    while (true) {
        const resultResponse = await fetch(`${MATHPIX_API_URL}/converter/${converterId}`, {
            headers: {
                'app_id': appId,
                'app_key': appKey,
            },
        });

        if (!resultResponse.ok) {
            const errorData = await resultResponse.json().catch(() => ({}));
            const errorMessage = errorData.error_info?.message || errorData.error || 'Failed to check Mathpix processing status.';
            throw new Error(errorMessage);
        }

        const resultData = await resultResponse.json();

        if (resultData.status === 'completed') {
            const textContent = resultData.conversion_results?.md;
            if (textContent) {
                return textContent;
            }
            throw new Error("Mathpix processing completed, but no text was found.");
        } else if (resultData.status === 'error' || resultData.status === 'rejected') {
            throw new Error(`Mathpix processing failed: ${resultData.error_info?.message || 'Unknown error'}`);
        }
        
        // Wait for 2 seconds before polling again to avoid rate limiting
        await sleep(2000);
    }
};