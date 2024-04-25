import { INewPost, INewUser, IUpdatePost, IUpdateUser } from "@/types";
import { ID } from "appwrite";
import { account, appwriteConfig, avatars, databases, storage } from "./config";
import { Query } from "appwrite";
import { convertListStringsToLowerCase, convertToLowerCase, removeAccentsAndWhitespace, removeVietnameseAccents, removeWhitespace } from "../utils";



export async function createUserAccount(user: INewUser) {
    try {
        const newAccount = await account.create(
            ID.unique(),
            user.email,
            user.password,
            user.name
        );
        if (!newAccount) throw Error;
        const avatarUrl = avatars.getInitials(user.name);
        const newUser = await saveUserToDB({
            accountId: newAccount.$id,
            name: newAccount.name,
            email: newAccount.email,
            username: user.username,
            imageUrl: avatarUrl,

        });

        return newUser;

    } catch (error) {
        console.log(error)
        return error;
    }

}


export async function saveUserToDB(user: {
    accountId: string;
    email: string;
    name: string;
    imageUrl: URL;
    username?: string;
}) {
    try {
        const newUser = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            ID.unique(),
            user,
        )
        return newUser;
    } catch (error) {
        console.log(error)

    }

}

export async function signInAccount(user: { email: string; password: string; }) {
    try {
        const session = await account.createEmailSession(user.email, user.password);
        return session;
    } catch (error) {
        console.log(error)
    }

}

export async function signOutAccount() {
    try {
        const session = await account.deleteSession("current");
        return session;
    } catch (error) {
        console.log(error)

    }
}

export async function createPost(post: INewPost) {
    try {
        //upload image to storage
        const uploadedFile = await uploadFile(post.file[0]);
        if (!uploadedFile) throw Error;

        //get file url
        const fileurl = getFilePreview(uploadedFile.$id);

        if (!fileurl) {
            deleteFile(uploadedFile.$id)
            throw Error;

        }
        //convert tag in an array
        const tags = post.tags?.replace(/ /g, '').split(',') || [];

        //* for search purpose
        //convert all uppercase to lowercase
        const convertedStrings = convertListStringsToLowerCase([

            post.caption,
            post.location,
        ]);
        //remove all vietnamese accents
        const removedAccents = removeVietnameseAccents([

            post.caption,
            post.location,
        ]);
        //remove all whitespace characters
        const removedWhitespace = removeWhitespace([

            post.caption,
            post.location,
        ]);
        //remove all accents and whitespace
        const removedAccentsAndWhitespace = removeAccentsAndWhitespace([

            post.caption,
            post.location,
        ]);

        //Save to database

        const newPost = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            ID.unique(),
            {
                creator: post.userId,
                caption: post.caption,
                imageUrl: fileurl,
                imageId: uploadedFile.$id,
                location: post.location,
                tags: tags,
                search: [
                    ...convertedStrings,
                    ...tags,
                    ...removedAccents,
                    ...removedWhitespace,
                    ...removedAccentsAndWhitespace,
                ],

            }
        )
        if (!newPost) {
            await deleteFile(uploadedFile.$id)
            throw Error;
        }

        return newPost;
    } catch (error) {
        console.log(error)
    }
}

export async function uploadFile(file: File) {
    try {
        const uploadedFile = await storage.createFile(
            appwriteConfig.storageId,
            ID.unique(),
            file
        );
        return uploadedFile;


    } catch (error) {
        console.log(error)
    }
}
export function getFilePreview(fileId: string) {
    try {
        const fileUrl = storage.getFilePreview(
            appwriteConfig.storageId,
            fileId,
            2000,
            2000,
            "top",
            100
        )
        return fileUrl
    } catch (error) {
        console.log(error)
    }
}
export async function deleteFile(fileId: string) {
    try {
        await storage.deleteFile(appwriteConfig.storageId, fileId);

        return { status: 'ok' }
    } catch (error) {
        console.log(error)
    }
}

export async function getRecentPost() {
    const posts = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.postCollectionId,
        [Query.orderDesc('$createdAt'), Query.limit(20)]
    )
    if (!posts) throw Error;
    return posts;

}

export async function likePost(postId: string, likesArray: string[]) {

    try {
        const updatePost = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            postId,
            {
                likes: likesArray
            })
        if (!updatePost) throw Error
        return updatePost;

    } catch (error) {
        console.log(error)
    }

}

export async function savePost(postId: string, userId: string) {

    try {
        const updatePost = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.savesCollectionedId,
            ID.unique(),
            {
                user: userId,
                post: postId
            })
        if (!updatePost) throw Error
        return updatePost;

    } catch (error) {
        console.log(error)
    }

}

export async function deleteSavedPost(savedRecordId: string) {

    try {
        const statusCode = await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.savesCollectionedId,
            savedRecordId,


        )
        if (!statusCode) throw Error
        return { status: 'ok' };

    } catch (error) {
        console.log(error)
    }

}

export async function getPostById(postId: string) {
    try {
        const post = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            postId
        )
        return post;
    } catch (error) {
        console.log(error)
    }

}

export async function updatePost(post: IUpdatePost) {
    const hasFileToUpdate = post.file.length > 0;
    try {

        let image = {
            imageUrl: post.imageUrl,
            imageId: post.imageId,
        }

        if (hasFileToUpdate) {

            //upload image to storage
            const uploadedFile = await uploadFile(post.file[0]);
            if (!uploadedFile) throw Error;

            //get file url
            const fileurl = getFilePreview(uploadedFile.$id);

            if (!fileurl) {
                deleteFile(uploadedFile.$id)
                throw Error;
            }
            image = { ...image, imageUrl: fileurl, imageId: uploadedFile.$id }
        }

        //convert tag in an array
        const tags = post.tags?.replace(/ /g, '').split(',') || [];

        //* for search purpose
        //convert all uppercase to lowercase
        const convertedStrings = convertListStringsToLowerCase([

            post.caption,
            post.location,
        ]);
        //remove all vietnamese accents
        const removedAccents = removeVietnameseAccents([

            post.caption,
            post.location,
        ]);
        //remove all whitespace characters
        const removedWhitespace = removeWhitespace([

            post.caption,
            post.location,
        ]);
        //remove all accents and whitespace
        const removedAccentsAndWhitespace = removeAccentsAndWhitespace([

            post.caption,
            post.location,
        ]);

        //Save to database

        const updatePost = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            post.postId,
            {

                caption: post.caption,
                imageUrl: image.imageUrl,
                imageId: image.imageId,
                location: post.location,
                tags: tags,
                search: [
                    ...convertedStrings,
                    ...tags,
                    ...removedAccents,
                    ...removedWhitespace,
                    ...removedAccentsAndWhitespace,
                ],

            }
        )
        if (!updatePost) {
            await deleteFile(post.imageId)
            throw Error;
        }

        return updatePost;
    } catch (error) {
        console.log(error)
    }
}

export async function deletePost(postId: string, imageId: string) {
    if (!postId || !imageId) throw Error;
    try {
        await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            postId,
        )
        return { status: 'ok' }
    } catch (error) {
        console.log(error)
    }

}

export async function getInfinitePosts({ pageParam }: { pageParam: number }) {
    const queries: any[] = [Query.orderDesc('$updatedAt'), Query.limit(10)]

    if (pageParam) {
        queries.push(Query.cursorAfter(pageParam.toString()));
    }
    try {
        const posts = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            queries
        )
        if (!posts) throw Error;
        return posts;
    } catch (error) {
        console.log(error)
    }
}



export async function searchPosts(searchTerm: string) {
    try {
        const convertedSearchTerm = convertToLowerCase(searchTerm);
        const posts = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,

            [
                Query.search('search', convertedSearchTerm),
            ],
        )
        console.log(posts)
        if (!posts) throw Error;
        console.log(posts)
        return posts;
    } catch (error) {
        console.log(error)
    }
}

// ============================================================
// USER
// ============================================================

export async function getUserPosts(userId?: string) {
    if (!userId) return;

    try {
        const post = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            [Query.equal("creator", userId), Query.orderDesc("$createdAt")]
        );

        if (!post) throw Error;

        return post;
    } catch (error) {
        console.log(error);
    }
}

export async function getUserById(userId: string) {
    try {
        const user = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            userId
        );

        if (!user) throw Error;

        return user;
    } catch (error) {
        console.log(error);
    }
}
// ============================== GET ACCOUNT
export async function getAccount() {
    try {
        const currentAccount = await account.get();

        return currentAccount;
    } catch (error) {
        console.log(error);
    }
}
export async function getCurrentUser() {
    try {
        const currentAccount = await getAccount();

        if (!currentAccount) throw Error;

        const currentUser = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            [Query.equal("accountId", currentAccount.$id)]
        );

        if (!currentUser) throw Error;

        return currentUser.documents[0];
    } catch (error) {
        console.log(error);
        return null;
    }
}


// ============================== GET USERS
export async function getUsers(limit?: number) {
    const queries: any[] = [Query.orderDesc("$createdAt")];

    if (limit) {
        queries.push(Query.limit(limit));
    }

    try {
        const users = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            queries
        );

        if (!users) throw Error;

        return users;
    } catch (error) {
        console.log(error);
    }
}
export async function updateUser(user: IUpdateUser) {
    const hasFileToUpdate = user.file.length > 0;
    try {
        let image = {
            imageUrl: user.imageUrl,
            imageId: user.imageId,
        };

        if (hasFileToUpdate) {
            // Upload new file to appwrite storage
            const uploadedFile = await uploadFile(user.file[0]);
            if (!uploadedFile) throw Error;

            // Get new file url
            const fileUrl = getFilePreview(uploadedFile.$id);
            if (!fileUrl) {
                await deleteFile(uploadedFile.$id);
                throw Error;
            }

            image = { ...image, imageUrl: fileUrl, imageId: uploadedFile.$id };
        }

        //  Update user
        const updatedUser = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            user.userId,
            {
                name: user.name,
                bio: user.bio,
                imageUrl: image.imageUrl,
                imageId: image.imageId,
            }
        );

        // Failed to update
        if (!updatedUser) {
            // Delete new file that has been recently uploaded
            if (hasFileToUpdate) {
                await deleteFile(image.imageId);
            }
            // If no new file uploaded, just throw error
            throw Error;
        }

        // Safely delete old file after successful update
        if (user.imageId && hasFileToUpdate) {
            await deleteFile(user.imageId);
        }

        return updatedUser;
    } catch (error) {
        console.log(error);
    }
}