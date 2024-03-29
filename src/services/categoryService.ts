import NsCategory from '../models/NsCategory';

const getCategories = async (): Promise<NsCategory.ICategory[]> => {


    const url = `https://shareworld-back.herokuapp.com/categories`;

    const fetchResult = await fetch(url);
    const jsonResult: NsCategory.ICategory[] = await fetchResult.json();

    if (!jsonResult) {
        throw Error('call api failed');
    }

    return jsonResult;

}
export const categoryService = { getCategories };
