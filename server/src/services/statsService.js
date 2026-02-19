const NFT = require('../models/NFT');
const Series = require('../models/Series');
const Order = require('../models/Order');

const getCollectionStats = async (collectionId) => {
    const series = await Series.find({ collection: collectionId, isActive: true });
    const seriesIds = series.map(s => s._id);

    const totalSupply = series.reduce((sum, s) => sum + s.totalSupply, 0);
    const totalMinted = series.reduce((sum, s) => sum + s.mintedCount, 0);

    const owners = await NFT.distinct('owner', { series: { $in: seriesIds }, owner: { $ne: null } });

    const listedNfts = await NFT.find({ series: { $in: seriesIds }, isListed: true }).sort({ listPrice: 1 }).limit(1);
    const floorPrice = listedNfts.length > 0 ? listedNfts[0].listPrice : (series.length > 0 ? Math.min(...series.map(s => s.price)) : 0);

    const volumeResult = await Order.aggregate([
        { $match: { nft: { $exists: true }, status: 'completed' } },
        { $lookup: { from: 'nfts', localField: 'nft', foreignField: '_id', as: 'nftDoc' } },
        { $unwind: '$nftDoc' },
        { $match: { 'nftDoc.series': { $in: seriesIds } } },
        { $group: { _id: null, totalVolume: { $sum: '$price' } } },
    ]);

    return {
        totalSupply,
        totalMinted,
        ownerCount: owners.length,
        floorPrice,
        totalVolume: volumeResult.length > 0 ? volumeResult[0].totalVolume : 0,
        seriesCount: series.length,
    };
};

const getSeriesStats = async (seriesId) => {
    const series = await Series.findById(seriesId);
    if (!series) return null;

    const owners = await NFT.distinct('owner', { series: seriesId, owner: { $ne: null } });

    const listedNfts = await NFT.find({ series: seriesId, isListed: true }).sort({ listPrice: 1 }).limit(1);
    const floorPrice = listedNfts.length > 0 ? listedNfts[0].listPrice : series.price;

    const volumeResult = await Order.aggregate([
        { $lookup: { from: 'nfts', localField: 'nft', foreignField: '_id', as: 'nftDoc' } },
        { $unwind: '$nftDoc' },
        { $match: { 'nftDoc.series': series._id, status: 'completed' } },
        { $group: { _id: null, totalVolume: { $sum: '$price' } } },
    ]);

    return {
        totalSupply: series.totalSupply,
        mintedCount: series.mintedCount,
        available: series.totalSupply - series.mintedCount,
        ownerCount: owners.length,
        floorPrice,
        totalVolume: volumeResult.length > 0 ? volumeResult[0].totalVolume : 0,
    };
};

const getPriceHistory = async (nftId) => {
    const orders = await Order.find({ nft: nftId, status: 'completed' })
        .sort({ createdAt: 1 })
        .select('price createdAt type')
        .lean();
    return orders;
};

module.exports = { getCollectionStats, getSeriesStats, getPriceHistory };
