import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ExamErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erro não tratado no Módulo de Exames:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-xl mx-auto my-12">
          <Card className="border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Ocorreu uma falha ao renderizar a visualização
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Os dados foram preservados no servidor, mas houve uma inconsistência na exibição visual.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-2 space-y-4 text-center">
              {this.state.error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl text-left border border-red-100 dark:border-red-900 text-xs font-mono text-red-700 dark:text-red-300 max-h-32 overflow-auto">
                  {this.state.error.message}
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  onClick={this.handleReset}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-600/20"
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Recarregar e Tentar Novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
