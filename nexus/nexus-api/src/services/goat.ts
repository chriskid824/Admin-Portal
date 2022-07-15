const token = process.env.GOAT_API_TOKEN;

const headers = {
  Authorization: `Token token="${token}"`,
  'Content-Type': 'application/json',
};
const baseUrl = 'https://www.goat.com/api/v1';

async function templateIdFromModelNumber(modelNumber: string) {
  const path = `/product_templates/search?sku=${modelNumber}`;
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers,
  });

  const data = await response.json();
  const templates = data?.productTemplates;
  if (templates) {
    if (templates.length > 1) {
      console.log('Found multiple templates: Skipping...');
    } else if (templates.length === 0) {
      console.log('Found no templates');
    } else {
      return templates[0].id;
    }
  } else {
    console.log('No templates found');
  }
  return null;
}

export async function fetchBestPricesWithModelNumber(modelNumber: string) {
  console.log('Fetching best prices from goat...');
  const templateId = await templateIdFromModelNumber(modelNumber);
  console.log(`Template ID: ${templateId}`);
  if (templateId) {
    const path = `/product_variants/buy_bar_data?countryCode=US&productTemplateId=${templateId}`;
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    const filtered = data.filter((item) => {
      return (
        item &&
        item.shoeCondition === 'new_no_defects' &&
        item.boxCondition === 'good_condition'
      );
    });
    return filtered;
  }
  return null;
}
