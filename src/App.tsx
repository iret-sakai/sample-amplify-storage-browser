import {
  createStorageBrowser,
} from '@aws-amplify/ui-react-storage/browser';
import '@aws-amplify/ui-react-storage/styles.css';
import './App.css';
import config from '../amplify_outputs.json';
import { Amplify } from 'aws-amplify';
import { Authenticator, Button } from '@aws-amplify/ui-react';

// Amplifyの設定を読み込み
Amplify.configure(config);

// （動作確認用）組織IDとフォルダプレフィックスを定数として定義
// 今回プレフィクスは組織IDごとに行うことを想定している
const orgId = "org-555";  // ユーザーが所属している組織ID（クレデンシャル生成に渡す組織ID）
const prefixFolder = "org-555";  // S3オブジェクトのプレフィックス

//S3ロケーション情報
async function getS3Locations() {
  if (!orgId) {
    throw new Error('Organization ID not found in user attributes');
  }
  return {
    items: [
      {
        id: 'example-folder',
        bucket: 'storage-browser-sample-bucket-test',
        prefix: `${prefixFolder}/`, 
        type: 'PREFIX' as const,
        permissions: ['delete', 'get', 'list', 'write'] as Array<'delete' | 'get' | 'list' | 'write'>, //UI上の表示有無
      },
    ],
    nextToken: undefined,
  }
}


//S3アクセス用の一時認証情報
const getLocationCredentials = async () => {
  try {
    // REST APIを呼び出してクレデンシャルを取得
    const apiUrl = `https://ee2p5pib4k.execute-api.ap-northeast-1.amazonaws.com/dev/create-credential?org=${orgId}`;
    
    console.log('API URL:', apiUrl); // デバッグ用
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // レスポンス内容をログ出力
    console.log('API Response:', data);
    
    // credentials が存在するかチェック
    if (!data || !data.credentials) {
      throw new Error('Invalid API response: credentials not found');
    }
    
    const { credentials } = data;
    
    // 必要なプロパティが存在するかチェック
    if (!credentials.accessKeyId || !credentials.secretAccessKey) {
      throw new Error('Invalid credentials: missing required properties');
    }

    return {
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken || '',
        expiration: credentials.expiration ? new Date(credentials.expiration) : new Date(Date.now() + 3600000),
      },
      expiration: credentials.expiration ? new Date(credentials.expiration) : new Date(Date.now() + 3600000),
    };
  } catch (error) {
    console.error('Error fetching credentials:', error);
    throw new Error(`Failed to fetch credentials`);
  }
}



//StorageBrowser用のカスタム認証設定
const { StorageBrowser } = createStorageBrowser({
  config: {
      listLocations: getS3Locations,
      getLocationCredentials: getLocationCredentials,
      registerAuthListener: () => () => {},
      region: 'ap-northeast-1', // 利用するリージョン
    },
});

function App() {
  return (
    <Authenticator>
      {({ signOut }) => (
        <>
          <div className="header">
            <Button onClick={signOut}>Sign out</Button>
          </div>
          <StorageBrowser />
        </>
      )}
    </Authenticator>
  );
}

export default App;