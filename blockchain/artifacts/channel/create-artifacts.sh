

# channel name defaults to "mychannel"
CHANNEL_NAME="mychannel"

echo $CHANNEL_NAME

# Generate Channel Genesis block
configtxgen -profile ThreeOrgsApplicationGenesis -configPath . -channelID $CHANNEL_NAME  -outputBlock ../../channel-artifacts/$CHANNEL_NAME.block
#export FABRIC_CFG_PATH= configtxgen -profile ThreeOrgsOrdererGenesis -channelID $CHANNEL_NAME -outputBlock ../../channel-artifacts/$CHANNEL_NAME.block

