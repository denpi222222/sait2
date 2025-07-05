# Script to update remaining locale files with missing translations

# Missing translations to add:
# 1. userNFTs section (after wallet)
# 2. common.total key  
# 3. status.burnable key
# 4. nft section (before pages)
# 5. wallet missing keys (notConnected, connectFirst)

# Languages to update: hi.json, tr.json, uk.json

# These need to be applied manually due to JSON structure
echo "Manual updates needed for:"
echo "1. hi.json (Hindi)"
echo "2. tr.json (Turkish)" 
echo "3. uk.json (Ukrainian)"

# Each file needs these additions:
echo ""
echo "userNFTs section:"
echo "Hindi: title: 'आपके NFT', connectToView: 'अपने CrazyCube NFT देखने के लिए वॉलेट कनेक्ट करें', etc."
echo "Turkish: title: 'NFT'leriniz', connectToView: 'CrazyCube NFT'lerinizi görmek için cüzdanınızı bağlayın', etc."  
echo "Ukrainian: title: 'Ваші NFT', connectToView: 'Підключіть гаманець, щоб побачити ваші CrazyCube NFT', etc."

echo ""
echo "status.burnable:"
echo "Hindi: 'जलाया जा सकता है'"
echo "Turkish: 'Yakılabilir'"
echo "Ukrainian: 'Можна спалити'"

echo ""
echo "nft.burnable:"
echo "Hindi: 'जलाया जा सकता है'"
echo "Turkish: 'Yakılabilir'" 
echo "Ukrainian: 'Можна спалити'"
